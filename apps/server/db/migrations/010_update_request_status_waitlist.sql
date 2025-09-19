-- Allow waitlisted → approved in update_request_status

CREATE OR REPLACE FUNCTION public.update_request_status(
  request_id uuid,
  new_status text,
  expected_status text DEFAULT NULL
)
RETURNS public.event_join_requests
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
  IF new_status = 'approved' AND (request_row.status = 'pending' OR request_row.status = 'waitlisted') THEN
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

