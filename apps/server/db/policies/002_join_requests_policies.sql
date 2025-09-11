-- RLS Policies for event_join_requests table
-- 
-- Security rules:
-- - Users can view requests they created OR host can view requests for their events
-- - Users can create requests for visible events (public or they're invited)
-- - Only hosts can approve/decline/waitlist/extend requests
-- - Users can only cancel their own pending requests
-- - No one can update expired requests

BEGIN;

-- ===============================================
-- Enable RLS on event_join_requests table
-- ===============================================
ALTER TABLE public.event_join_requests ENABLE ROW LEVEL SECURITY;

-- ===============================================
-- Helper function: check if user is event host
-- ===============================================
CREATE OR REPLACE FUNCTION is_event_host(event_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS(
        SELECT 1 FROM public.events 
        WHERE id = event_uuid 
        AND created_by = user_uuid
    );
$$;

-- ===============================================
-- Helper function: check if event is visible to user  
-- ===============================================
CREATE OR REPLACE FUNCTION is_event_visible(event_uuid uuid, user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS(
        -- Event is public OR user is host OR user is participant
        SELECT 1 FROM public.events e
        WHERE e.id = event_uuid 
        AND (
            e.is_public = true 
            OR e.created_by = user_uuid
            OR EXISTS(
                SELECT 1 FROM public.event_participants ep
                WHERE ep.event_id = event_uuid AND ep.user_id = user_uuid
            )
        )
        -- Event must not be archived/purged
        AND e.status NOT IN ('purged')
    );
$$;

-- ===============================================
-- SELECT Policy: Users can view their own requests OR hosts can view requests for their events
-- ===============================================
CREATE POLICY "Users can view own requests or hosts can view event requests"
ON public.event_join_requests
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()  -- User can see their own requests
    OR 
    is_event_host(event_id, auth.uid())  -- Host can see all requests for their events
);

-- ===============================================
-- INSERT Policy: Users can create requests for visible events if not archived/purged
-- ===============================================
CREATE POLICY "Users can create requests for visible events"
ON public.event_join_requests
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()  -- Can only create requests for themselves
    AND
    is_event_visible(event_id, auth.uid())  -- Event must be visible
    AND
    -- Cannot request if already a participant
    NOT EXISTS(
        SELECT 1 FROM public.event_participants ep
        WHERE ep.event_id = event_join_requests.event_id 
        AND ep.user_id = auth.uid()
    )
    AND
    -- Event must be published (not draft, cancelled, completed, or purged)
    EXISTS(
        SELECT 1 FROM public.events e
        WHERE e.id = event_join_requests.event_id 
        AND e.status = 'published'
    )
);

-- ===============================================
-- UPDATE Policy: Different rules based on action type
-- ===============================================

-- Hosts can approve/decline/waitlist/extend any request for their events
CREATE POLICY "Hosts can manage requests for their events"
ON public.event_join_requests
FOR UPDATE
TO authenticated
USING (
    is_event_host(event_id, auth.uid())
    -- Hosts cannot modify expired or cancelled requests
    AND status NOT IN ('expired', 'cancelled')
)
WITH CHECK (
    is_event_host(event_id, auth.uid())
    -- Valid status transitions for host actions
    AND (
        -- Approve: pending -> approved
        (OLD.status = 'pending' AND status = 'approved')
        OR
        -- Decline: pending -> declined  
        (OLD.status = 'pending' AND status = 'declined')
        OR
        -- Waitlist: pending -> waitlisted
        (OLD.status = 'pending' AND status = 'waitlisted')
        OR
        -- Extend hold: pending -> pending (with updated hold_expires_at)
        (OLD.status = 'pending' AND status = 'pending' AND hold_expires_at > OLD.hold_expires_at)
    )
);

-- Users can cancel their own pending requests (not expired)
CREATE POLICY "Users can cancel own pending requests"
ON public.event_join_requests
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
    AND status = 'pending'
    AND (hold_expires_at IS NULL OR hold_expires_at > now())  -- Not expired
)
WITH CHECK (
    user_id = auth.uid()
    AND OLD.status = 'pending'
    AND status = 'cancelled'
);

-- ===============================================
-- DELETE Policy: Not used (we use status updates instead)
-- ===============================================
-- No DELETE policy - we keep records for audit trail

-- ===============================================
-- Anonymous/public access for public event discovery
-- ===============================================

-- Anonymous users can view requests for public events (for availability calculation)
CREATE POLICY "Anonymous can view requests for public events"
ON public.event_join_requests  
FOR SELECT
TO anon
USING (
    EXISTS(
        SELECT 1 FROM public.events e
        WHERE e.id = event_id 
        AND e.is_public = true
        AND e.status = 'published'
    )
);

-- Anonymous users can create requests for public events
CREATE POLICY "Anonymous can request to join public events"
ON public.event_join_requests
FOR INSERT  
TO anon
WITH CHECK (
    -- Event must be public and published
    EXISTS(
        SELECT 1 FROM public.events e
        WHERE e.id = event_join_requests.event_id 
        AND e.is_public = true
        AND e.status = 'published'
    )
    -- For anonymous users, user_id should be null or handled by application
    -- This depends on how you handle guest requests - may need adjustment
);

-- ===============================================
-- Comments for documentation
-- ===============================================
COMMENT ON POLICY "Users can view own requests or hosts can view event requests" ON public.event_join_requests 
IS 'SELECT: Users see own requests, hosts see all requests for their events';

COMMENT ON POLICY "Users can create requests for visible events" ON public.event_join_requests
IS 'INSERT: Users can request visible, published events they are not already in';

COMMENT ON POLICY "Hosts can manage requests for their events" ON public.event_join_requests
IS 'UPDATE: Hosts can approve/decline/waitlist/extend requests for their events';

COMMENT ON POLICY "Users can cancel own pending requests" ON public.event_join_requests
IS 'UPDATE: Users can cancel their own pending (not expired) requests';

COMMENT ON FUNCTION is_event_host(uuid, uuid) IS 'RLS helper: check if user is host of event';
COMMENT ON FUNCTION is_event_visible(uuid, uuid) IS 'RLS helper: check if event is visible to user';

COMMIT;
