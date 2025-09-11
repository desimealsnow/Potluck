-- Join Requests System Migration
-- Adds join request functionality with capacity management and soft holds
-- 
-- This migration:
-- 1. Adds missing columns to existing tables (capacity_total, party_size, is_public)
-- 2. Creates event_join_requests table
-- 3. Creates availability calculation function  
-- 4. Sets up indexes and constraints
-- 5. Adds updated_at trigger

BEGIN;

-- ===============================================
-- 1. Update existing events table
-- ===============================================
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS capacity_total integer,
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Set reasonable defaults for existing events
UPDATE public.events 
SET capacity_total = COALESCE(max_guests, min_guests * 2, 10)
WHERE capacity_total IS NULL;

-- Make capacity_total required going forward
ALTER TABLE public.events 
ALTER COLUMN capacity_total SET NOT NULL,
ADD CONSTRAINT events_capacity_total_positive CHECK (capacity_total >= 1);

-- ===============================================
-- 2. Update existing event_participants table
-- ===============================================
ALTER TABLE public.event_participants 
ADD COLUMN IF NOT EXISTS party_size integer DEFAULT 1;

-- Set party_size = 1 for existing participants
UPDATE public.event_participants 
SET party_size = 1
WHERE party_size IS NULL;

-- Make party_size required going forward
ALTER TABLE public.event_participants
ALTER COLUMN party_size SET NOT NULL,
ADD CONSTRAINT participants_party_size_positive CHECK (party_size >= 1);

-- ===============================================
-- 3. Create event_join_requests table
-- ===============================================
CREATE TABLE IF NOT EXISTS public.event_join_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    party_size integer NOT NULL CHECK (party_size >= 1),
    note text,
    status text NOT NULL CHECK (status IN ('pending', 'approved', 'declined', 'waitlisted', 'expired', 'cancelled')),
    hold_expires_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===============================================
-- 4. Create indexes
-- ===============================================
CREATE INDEX IF NOT EXISTS idx_join_requests_event_status 
ON public.event_join_requests (event_id, status);

CREATE INDEX IF NOT EXISTS idx_join_requests_hold_expires 
ON public.event_join_requests (hold_expires_at) 
WHERE status = 'pending' AND hold_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_join_requests_user 
ON public.event_join_requests (user_id);

-- Unique constraint: one pending request per user per event
CREATE UNIQUE INDEX IF NOT EXISTS idx_join_requests_unique_pending
ON public.event_join_requests (event_id, user_id)
WHERE status = 'pending';

-- ===============================================
-- 5. Create availability calculation function
-- ===============================================
CREATE OR REPLACE FUNCTION availability_for_event(event_uuid uuid)
RETURNS TABLE(total integer, confirmed integer, held integer, available integer)
LANGUAGE sql
STABLE
AS $$
    WITH event_capacity AS (
        SELECT capacity_total as total
        FROM public.events 
        WHERE id = event_uuid
    ),
    confirmed_participants AS (
        SELECT COALESCE(SUM(party_size), 0) as confirmed
        FROM public.event_participants 
        WHERE event_id = event_uuid 
        AND status = 'accepted'
    ),
    active_holds AS (
        SELECT COALESCE(SUM(party_size), 0) as held
        FROM public.event_join_requests 
        WHERE event_id = event_uuid 
        AND status = 'pending' 
        AND hold_expires_at > now()
    )
    SELECT 
        ec.total,
        cp.confirmed,
        ah.held,
        GREATEST(0, ec.total - cp.confirmed - ah.held) as available
    FROM event_capacity ec
    CROSS JOIN confirmed_participants cp  
    CROSS JOIN active_holds ah;
$$;

-- ===============================================
-- 6. Create updated_at trigger for join_requests
-- ===============================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_join_requests
    BEFORE UPDATE ON public.event_join_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- ===============================================
-- 7. Create function to expire holds (for background job)
-- ===============================================
CREATE OR REPLACE FUNCTION expire_join_request_holds()
RETURNS integer
LANGUAGE sql
AS $$
    WITH updated AS (
        UPDATE public.event_join_requests 
        SET status = 'expired', updated_at = now()
        WHERE status = 'pending' 
        AND hold_expires_at IS NOT NULL 
        AND hold_expires_at <= now()
        RETURNING 1
    )
    SELECT COUNT(*) FROM updated;
$$;

-- ===============================================
-- 8. Create atomic request status update procedure
-- ===============================================
CREATE OR REPLACE FUNCTION update_request_status(
  request_id uuid,
  new_status text,
  expected_status text DEFAULT NULL
)
RETURNS event_join_requests
LANGUAGE plpgsql
AS $$
DECLARE
  request_row event_join_requests;
  availability_data RECORD;
BEGIN
  -- Lock and get the request
  SELECT * INTO request_row
  FROM public.event_join_requests
  WHERE id = request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  -- Check expected status if provided
  IF expected_status IS NOT NULL AND request_row.status != expected_status THEN
    RAISE EXCEPTION 'Invalid status transition: expected %, got %', expected_status, request_row.status;
  END IF;
  
  -- For approvals, check capacity and create participant
  IF new_status = 'approved' AND request_row.status = 'pending' THEN
    -- Get current availability atomically
    SELECT * FROM availability_for_event(request_row.event_id) INTO availability_data;
    
    IF availability_data.available < request_row.party_size THEN
      RAISE EXCEPTION 'Insufficient capacity: need %, have %', request_row.party_size, availability_data.available;
    END IF;
    
    -- Create participant record
    INSERT INTO public.event_participants (event_id, user_id, status, party_size, joined_at)
    VALUES (request_row.event_id, request_row.user_id, 'accepted', request_row.party_size, now());
  END IF;
  
  -- Update the request
  UPDATE public.event_join_requests 
  SET status = new_status, updated_at = now()
  WHERE id = request_id
  RETURNING * INTO request_row;
  
  RETURN request_row;
END;
$$;

-- ===============================================
-- 9. Add helpful comments
-- ===============================================
COMMENT ON TABLE public.event_join_requests IS 'Join requests for events with capacity holds';
COMMENT ON COLUMN public.event_join_requests.hold_expires_at IS 'When the capacity hold expires (for pending requests only)';
COMMENT ON COLUMN public.event_join_requests.party_size IS 'Number of people in the requesting party';
COMMENT ON FUNCTION availability_for_event(uuid) IS 'Calculate event capacity: total, confirmed, held, available';
COMMENT ON FUNCTION expire_join_request_holds() IS 'Background job function to expire pending holds';
COMMENT ON FUNCTION update_request_status(uuid, text, text) IS 'Atomically update request status with capacity checking';

COMMIT;
