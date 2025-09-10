-- Participants RLS Policy Tests  
-- Tests Row-Level Security policies for event_participants table
-- Run with: pg_prove tests/pg/participants_rls.sql --host localhost --port 54322 --username postgres --dbname postgres

BEGIN;

SELECT plan(10);

-- Test setup
SET LOCAL "request.jwt.claims" TO '{}'; -- Service role

-- Create test event (private)
INSERT INTO locations (id, name) VALUES ('test-loc', 'Test Location');

INSERT INTO events (id, title, event_date, min_guests, max_guests, meal_type, status, created_by, location_id, attendee_count) 
VALUES (
  'test-event-private',
  'Private Test Event',
  '2024-06-01T18:00:00Z', 
  5, 20, 'mixed', 'published',
  '11111111-1111-1111-1111-111111111111', -- Host
  'test-loc', 1
);

-- Create public event
INSERT INTO events (id, title, event_date, min_guests, max_guests, meal_type, status, created_by, location_id, attendee_count, is_public) 
VALUES (
  'test-event-public',
  'Public Test Event',
  '2024-06-02T18:00:00Z',
  5, 20, 'mixed', 'published', 
  '11111111-1111-1111-1111-111111111111', -- Host
  'test-loc', 1, true
);

-- Add host as participant to both events
INSERT INTO event_participants (event_id, user_id, status, joined_at)
VALUES 
  ('test-event-private', '11111111-1111-1111-1111-111111111111', 'accepted', NOW()),
  ('test-event-public', '11111111-1111-1111-1111-111111111111', 'accepted', NOW());

-- Test 1: Host can invite participant to private event
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT lives_ok(
  'INSERT INTO event_participants (event_id, user_id, status) VALUES (''test-event-private'', ''22222222-2222-2222-2222-222222222222'', ''invited'')',
  'Host can invite participant to private event'
);

-- Test 2: User can self-join public event
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

SELECT lives_ok(
  'INSERT INTO event_participants (event_id, user_id, status) VALUES (''test-event-public'', ''33333333-3333-3333-3333-333333333333'', ''pending'')',
  'User can self-join public event'
);

-- Test 3: User cannot self-join private event without invitation
SELECT throws_ok(
  'INSERT INTO event_participants (event_id, user_id, status) VALUES (''test-event-private'', ''33333333-3333-3333-3333-333333333333'', ''pending'')',
  'new row violates row-level security policy',
  'User cannot self-join private event'
);

-- Test 4: Participant can view other participants in events they joined
SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT ok(
  (SELECT COUNT(*) FROM event_participants WHERE event_id = 'test-event-private') >= 1,
  'Participant can view participants in events they joined'
);

-- Test 5: Outsider cannot view participants in private events
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

SELECT ok(
  (SELECT COUNT(*) FROM event_participants WHERE event_id = 'test-event-private') = 0,
  'Outsider cannot view participants in private events'
);

-- Test 6: Participant can update own RSVP status
SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT lives_ok(
  'UPDATE event_participants SET status = ''accepted'' WHERE event_id = ''test-event-private'' AND user_id = ''22222222-2222-2222-2222-222222222222''',
  'Participant can update own RSVP status'
);

-- Test 7: Participant cannot update others RSVP status
SELECT throws_ok(
  'UPDATE event_participants SET status = ''declined'' WHERE event_id = ''test-event-private'' AND user_id = ''11111111-1111-1111-1111-111111111111''',
  'new row violates row-level security policy', 
  'Participant cannot update others RSVP status'
);

-- Test 8: Host can update any participant RSVP status
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT lives_ok(
  'UPDATE event_participants SET status = ''maybe'' WHERE event_id = ''test-event-private'' AND user_id = ''22222222-2222-2222-2222-222222222222''',
  'Host can update any participant RSVP status'
);

-- Test 9: Participant can leave event (delete own participation)
SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT lives_ok(
  'DELETE FROM event_participants WHERE event_id = ''test-event-private'' AND user_id = ''22222222-2222-2222-2222-222222222222''',
  'Participant can leave event'
);

-- Re-add participant for next test
SET LOCAL "request.jwt.claims" TO '{}';
INSERT INTO event_participants (event_id, user_id, status) VALUES ('test-event-private', '22222222-2222-2222-2222-222222222222', 'accepted');

-- Test 10: Host can remove participants
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT lives_ok(
  'DELETE FROM event_participants WHERE event_id = ''test-event-private'' AND user_id = ''22222222-2222-2222-2222-222222222222''',
  'Host can remove participants'
);

SELECT * FROM finish();

ROLLBACK;