-- Events RLS Policy Tests
-- Tests Row-Level Security policies for the events table
-- Run with: pg_prove tests/pg/events_rls.sql --host localhost --port 54322 --username postgres --dbname postgres

BEGIN;

-- Load pgTap extension
SELECT plan(12);

-- Test setup: Create test users and data
SET LOCAL "request.jwt.claims" TO '{}'; -- Start as service role

-- Insert test locations
INSERT INTO locations (id, name, formatted_address) VALUES 
  ('loc-1', 'Test Venue 1', '123 Test St, Test City'),
  ('loc-2', 'Test Venue 2', '456 Test Ave, Test Town');

-- Insert test event as host user
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

INSERT INTO events (id, title, description, event_date, min_guests, max_guests, meal_type, status, created_by, location_id, attendee_count) 
VALUES (
  'event-host-private',
  'Host Private Event', 
  'Private event hosted by test user',
  '2024-06-01T18:00:00Z',
  5, 20, 'mixed', 'published',
  '11111111-1111-1111-1111-111111111111',
  'loc-1', 1
);

INSERT INTO events (id, title, description, event_date, min_guests, max_guests, meal_type, status, created_by, location_id, attendee_count, is_public) 
VALUES (
  'event-host-public',
  'Host Public Event', 
  'Public event hosted by test user',
  '2024-06-02T18:00:00Z',
  5, 20, 'mixed', 'published',
  '11111111-1111-1111-1111-111111111111',
  'loc-2', 1, true
);

-- Add participants to private event
INSERT INTO event_participants (event_id, user_id, status, joined_at)
VALUES 
  ('event-host-private', '11111111-1111-1111-1111-111111111111', 'accepted', NOW()), -- Host
  ('event-host-private', '22222222-2222-2222-2222-222222222222', 'accepted', NOW()); -- Participant

-- Test 1: Host can read own private events
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = 'event-host-private') = 1,
  'Host can read own private events'
);

-- Test 2: Host can read own public events  
SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = 'event-host-public') = 1,
  'Host can read own public events'
);

-- Test 3: Participant can read private events they joined
SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = 'event-host-private') = 1,
  'Participant can read private events they joined'
);

-- Test 4: Participant can read public events (even without joining)
SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = 'event-host-public') = 1,
  'Participant can read public events'
);

-- Test 5: Outsider cannot read private events
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333", "role": "authenticated"}';

SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = 'event-host-private') = 0,
  'Outsider cannot read private events'
);

-- Test 6: Outsider can read public events
SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = 'event-host-public') = 1,
  'Outsider can read public events'
);

-- Test 7: Anonymous user cannot read private events
SET LOCAL "request.jwt.claims" TO '{"role": "anon"}';

SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = 'event-host-private') = 0,
  'Anonymous user cannot read private events'
);

-- Test 8: Anonymous user can read public events
SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = 'event-host-public') = 1,
  'Anonymous user can read public events'
);

-- Test 9: Host can update own events
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT lives_ok(
  'UPDATE events SET title = ''Updated Title'' WHERE id = ''event-host-private''',
  'Host can update own events'
);

-- Test 10: Non-host cannot update events
SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT throws_ok(
  'UPDATE events SET title = ''Hacked Title'' WHERE id = ''event-host-private''',
  'new row violates row-level security policy',
  'Non-host cannot update events'
);

-- Test 11: Host can delete own draft events
SET LOCAL "request.jwt.claims" TO '{}'; -- Service role to insert draft
INSERT INTO events (id, title, event_date, min_guests, max_guests, meal_type, status, created_by, location_id, attendee_count) 
VALUES (
  'event-draft',
  'Draft Event', 
  '2024-06-03T18:00:00Z',
  5, 20, 'mixed', 'draft',
  '11111111-1111-1111-1111-111111111111',
  'loc-1', 1
);

SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111", "role": "authenticated"}';

SELECT lives_ok(
  'DELETE FROM events WHERE id = ''event-draft'' AND status = ''draft''',
  'Host can delete own draft events'
);

-- Test 12: Non-host cannot delete events
SET LOCAL "request.jwt.claims" TO '{}'; -- Service role to recreate draft
INSERT INTO events (id, title, event_date, min_guests, max_guests, meal_type, status, created_by, location_id, attendee_count) 
VALUES (
  'event-draft-2',
  'Another Draft Event', 
  '2024-06-04T18:00:00Z',
  5, 20, 'mixed', 'draft',
  '11111111-1111-1111-1111-111111111111',
  'loc-1', 1
);

SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222", "role": "authenticated"}';

SELECT throws_ok(
  'DELETE FROM events WHERE id = ''event-draft-2''',
  'new row violates row-level security policy',
  'Non-host cannot delete events'
);

-- Finish tests
SELECT * FROM finish();

ROLLBACK;
