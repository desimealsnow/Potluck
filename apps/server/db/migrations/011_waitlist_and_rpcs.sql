-- Add waitlist_pos for manual priority
ALTER TABLE public.event_join_requests
  ADD COLUMN IF NOT EXISTS waitlist_pos numeric;

CREATE INDEX IF NOT EXISTS idx_join_requests_waitlist
  ON public.event_join_requests(event_id, status, waitlist_pos, created_at);

-- Atomic intake for join requests
CREATE OR REPLACE FUNCTION public.process_join_request(
  p_event_id uuid,
  p_user_id uuid,
  p_party_size int,
  p_note text,
  p_hold_ttl_minutes int DEFAULT 30,
  p_auto_approve boolean DEFAULT false
) RETURNS public.event_join_requests
LANGUAGE plpgsql AS $$
DECLARE
  v_total int;
  v_confirmed int;
  v_held int;
  v_available int;
  v_req public.event_join_requests;
  v_hold_expires timestamptz;
BEGIN
  -- Lock event row to serialize capacity decisions
  SELECT capacity_total INTO v_total
  FROM public.events
  WHERE id = p_event_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Event not found'; END IF;

  -- Seats in use: accepted participants (sum party_size)
  SELECT COALESCE(SUM(party_size),0) INTO v_confirmed
  FROM public.event_participants
  WHERE event_id = p_event_id AND status = 'accepted'
  FOR UPDATE;

  -- Held seats: pending requests not expired
  SELECT COALESCE(SUM(party_size),0) INTO v_held
  FROM public.event_join_requests
  WHERE event_id = p_event_id AND status = 'pending' AND (hold_expires_at IS NOT NULL AND hold_expires_at > now())
  FOR UPDATE;

  v_available := CASE WHEN v_total IS NULL THEN NULL ELSE v_total - v_confirmed - v_held END;

  IF v_total IS NULL THEN
    -- Unlimited: approve immediately
    INSERT INTO public.event_participants(event_id, user_id, status, party_size, joined_at)
    VALUES (p_event_id, p_user_id, 'accepted', p_party_size, now());

    INSERT INTO public.event_join_requests(event_id, user_id, party_size, note, status)
    VALUES (p_event_id, p_user_id, p_party_size, p_note, 'approved')
    RETURNING * INTO v_req;

    RETURN v_req;
  END IF;

  IF p_auto_approve AND v_available >= p_party_size THEN
    -- Auto-approve path
    INSERT INTO public.event_participants(event_id, user_id, status, party_size, joined_at)
    VALUES (p_event_id, p_user_id, 'accepted', p_party_size, now());

    INSERT INTO public.event_join_requests(event_id, user_id, party_size, note, status)
    VALUES (p_event_id, p_user_id, p_party_size, p_note, 'approved')
    RETURNING * INTO v_req;

    RETURN v_req;
  ELSIF v_available >= p_party_size THEN
    -- Seat is available but host wants approval: place a timed hold
    v_hold_expires := now() + make_interval(mins => p_hold_ttl_minutes);
    INSERT INTO public.event_join_requests(event_id, user_id, party_size, note, status, hold_expires_at)
    VALUES (p_event_id, p_user_id, p_party_size, p_note, 'pending', v_hold_expires)
    RETURNING * INTO v_req;

    RETURN v_req;
  ELSE
    -- Not enough seats → waitlist (priority FIFO by default)
    INSERT INTO public.event_join_requests(event_id, user_id, party_size, note, status, waitlist_pos)
    VALUES (p_event_id, p_user_id, p_party_size, p_note, 'waitlisted', EXTRACT(EPOCH FROM now()))
    RETURNING * INTO v_req;

    RETURN v_req;
  END IF;
END;
$$;

-- Auto-promotion of waitlisted requests
CREATE OR REPLACE FUNCTION public.promote_from_waitlist(p_event_id uuid)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  v_total int;
  v_confirmed int;
  v_held int;
  v_available int;
  v_req record;
  v_moved int := 0;
BEGIN
  -- Lock event for capacity snapshot
  SELECT capacity_total INTO v_total FROM public.events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT COALESCE(SUM(party_size),0) INTO v_confirmed
  FROM public.event_participants WHERE event_id = p_event_id AND status = 'accepted' FOR UPDATE;

  SELECT COALESCE(SUM(party_size),0) INTO v_held
  FROM public.event_join_requests
  WHERE event_id = p_event_id AND status = 'pending' AND (hold_expires_at IS NOT NULL AND hold_expires_at > now())
  FOR UPDATE;

  v_available := CASE WHEN v_total IS NULL THEN 999999 ELSE v_total - v_confirmed - v_held END;

  -- Find first promotable request by priority and size
  SELECT * INTO v_req
  FROM public.event_join_requests
  WHERE event_id = p_event_id AND status = 'waitlisted' AND party_size <= v_available
  ORDER BY waitlist_pos NULLS LAST, created_at
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN RETURN 0; END IF;

  PERFORM public.update_request_status(v_req.id, 'approved', 'waitlisted');
  v_moved := 1;

  RETURN v_moved;
END;
$$;


