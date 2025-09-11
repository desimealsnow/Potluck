import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { supabase } from '../../../src/config/supabaseClient';

// These are database function tests that require a test database
// They can be skipped in environments where DB is not available
const isDbAvailable = process.env.NODE_ENV === 'test' && process.env.SUPABASE_URL;

const describeDb = isDbAvailable ? describe : describe.skip;

describeDb('Database Functions', () => {
  let testEventId: string;
  let testUserId1: string;
  let testUserId2: string;
  
  beforeAll(async () => {
    // Create test users (this would normally be done by Supabase Auth)
    testUserId1 = '11111111-1111-1111-1111-111111111111';
    testUserId2 = '22222222-2222-2222-2222-222222222222';
  });

  beforeEach(async () => {
    // Create a test location
    const { data: location } = await supabase
      .from('locations')
      .insert({
        id: 'test-location-1',
        name: 'Test Venue',
        formatted_address: '123 Test St'
      })
      .select()
      .single();

    // Create a test event
    const { data: event } = await supabase
      .from('events')
      .insert({
        id: 'test-event-1',
        title: 'Test Event',
        description: 'Test event for function testing',
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        min_guests: 5,
        max_guests: 20,
        capacity_total: 15,
        meal_type: 'mixed',
        is_public: true,
        status: 'published',
        created_by: testUserId1,
        location_id: location.id,
        attendee_count: 1
      })
      .select()
      .single();

    testEventId = event.id;

    // Add host as participant  
    await supabase
      .from('event_participants')
      .insert({
        event_id: testEventId,
        user_id: testUserId1,
        status: 'accepted',
        party_size: 1
      });
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('event_join_requests').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('event_participants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  });

  describe('availability_for_event function', () => {
    it('should calculate availability correctly with no requests', async () => {
      const { data, error } = await supabase.rpc('availability_for_event', {
        event_uuid: testEventId
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        total: 15,
        confirmed: 1, // Host is already a participant
        held: 0,
        available: 14
      });
    });

    it('should calculate availability with pending holds', async () => {
      // Create a pending join request with hold
      const holdExpiry = new Date();
      holdExpiry.setMinutes(holdExpiry.getMinutes() + 30);

      await supabase
        .from('event_join_requests')
        .insert({
          event_id: testEventId,
          user_id: testUserId2,
          party_size: 3,
          status: 'pending',
          hold_expires_at: holdExpiry.toISOString()
        });

      const { data, error } = await supabase.rpc('availability_for_event', {
        event_uuid: testEventId
      });

      expect(error).toBeNull();
      expect(data[0]).toMatchObject({
        total: 15,
        confirmed: 1,
        held: 3, // Pending hold
        available: 11 // 15 - 1 - 3
      });
    });

    it('should not count expired holds', async () => {
      // Create an expired hold
      const expiredHold = new Date();
      expiredHold.setMinutes(expiredHold.getMinutes() - 10); // 10 minutes ago

      await supabase
        .from('event_join_requests')
        .insert({
          event_id: testEventId,
          user_id: testUserId2,
          party_size: 5,
          status: 'pending',
          hold_expires_at: expiredHold.toISOString()
        });

      const { data, error } = await supabase.rpc('availability_for_event', {
        event_uuid: testEventId
      });

      expect(error).toBeNull();
      expect(data[0]).toMatchObject({
        total: 15,
        confirmed: 1,
        held: 0, // Expired hold should not be counted
        available: 14
      });
    });

    it('should count multiple participants correctly', async () => {
      // Add another confirmed participant
      await supabase
        .from('event_participants')
        .insert({
          event_id: testEventId,
          user_id: testUserId2,
          status: 'accepted',
          party_size: 4
        });

      const { data, error } = await supabase.rpc('availability_for_event', {
        event_uuid: testEventId
      });

      expect(error).toBeNull();
      expect(data[0]).toMatchObject({
        total: 15,
        confirmed: 5, // 1 + 4
        held: 0,
        available: 10
      });
    });

    it('should handle non-existent event', async () => {
      const { data, error } = await supabase.rpc('availability_for_event', {
        event_uuid: '00000000-0000-0000-0000-000000000000'
      });

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0]).toMatchObject({
        total: null, // Should handle missing event gracefully
        confirmed: 0,
        held: 0,
        available: null
      });
    });
  });

  describe('update_request_status function', () => {
    let testRequestId: string;

    beforeEach(async () => {
      // Create a pending request
      const holdExpiry = new Date();
      holdExpiry.setMinutes(holdExpiry.getMinutes() + 30);

      const { data: request } = await supabase
        .from('event_join_requests')
        .insert({
          event_id: testEventId,
          user_id: testUserId2,
          party_size: 2,
          status: 'pending',
          hold_expires_at: holdExpiry.toISOString()
        })
        .select()
        .single();

      testRequestId = request.id;
    });

    it('should approve request and create participant', async () => {
      const { data, error } = await supabase.rpc('update_request_status', {
        request_id: testRequestId,
        new_status: 'approved',
        expected_status: 'pending'
      });

      expect(error).toBeNull();
      expect(data.status).toBe('approved');
      expect(data.id).toBe(testRequestId);

      // Verify participant was created
      const { data: participants } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', testEventId)
        .eq('user_id', testUserId2);

      expect(participants).toHaveLength(1);
      expect(participants).not.toBeNull();
      expect(participants![0]).toMatchObject({
        status: 'accepted',
        party_size: 2
      });
    });

    it('should decline request without creating participant', async () => {
      const { data, error } = await supabase.rpc('update_request_status', {
        request_id: testRequestId,
        new_status: 'declined',
        expected_status: 'pending'
      });

      expect(error).toBeNull();
      expect(data.status).toBe('declined');

      // Verify no participant was created
      const { data: participants } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', testEventId)
        .eq('user_id', testUserId2);

      expect(participants).toHaveLength(0);
    });

    it('should enforce capacity limits during approval', async () => {
      // Fill up most of the capacity
      await supabase
        .from('event_participants')
        .insert({
          event_id: testEventId,
          user_id: 'filler-user-1',
          status: 'accepted',
          party_size: 13 // 1 (host) + 13 = 14, leaving only 1 spot
        });

      // Try to approve a request for 2 people (should fail)
      const { data, error } = await supabase.rpc('update_request_status', {
        request_id: testRequestId,
        new_status: 'approved',
        expected_status: 'pending'
      });

      expect(error).not.toBeNull();
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Insufficient capacity');
      expect(error).not.toBeNull();
      expect(error!.message).toContain('need 2, have 1');
    });

    it('should validate expected status', async () => {
      const { data, error } = await supabase.rpc('update_request_status', {
        request_id: testRequestId,
        new_status: 'approved',
        expected_status: 'declined' // Wrong expected status
      });

      expect(error).not.toBeNull();
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Invalid status transition');
      expect(error).not.toBeNull();
      expect(error!.message).toContain('expected declined, got pending');
    });

    it('should handle non-existent request', async () => {
      const { data, error } = await supabase.rpc('update_request_status', {
        request_id: '00000000-0000-0000-0000-000000000000',
        new_status: 'approved'
      });

      expect(error).not.toBeNull();
      expect(error).not.toBeNull();
      expect(error!.message).toBe('Request not found');
    });

    it('should update status and timestamp', async () => {
      const beforeTime = new Date();

      const { data, error } = await supabase.rpc('update_request_status', {
        request_id: testRequestId,
        new_status: 'declined'
      });

      const afterTime = new Date();

      expect(error).toBeNull();
      expect(data.status).toBe('declined');
      
      const updatedAt = new Date(data.updated_at);
      expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(updatedAt.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });
  });

  describe('expire_join_request_holds function', () => {
    it('should expire holds that have passed their expiry time', async () => {
      const expiredTime = new Date();
      expiredTime.setMinutes(expiredTime.getMinutes() - 10);

      const futureTime = new Date();
      futureTime.setMinutes(futureTime.getMinutes() + 10);

      // Create expired request
      await supabase
        .from('event_join_requests')
        .insert({
          event_id: testEventId,
          user_id: testUserId2,
          party_size: 2,
          status: 'pending',
          hold_expires_at: expiredTime.toISOString()
        });

      // Create non-expired request
      const { data: futureRequest } = await supabase
        .from('event_join_requests')
        .insert({
          event_id: testEventId,
          user_id: 'user-3',
          party_size: 1,
          status: 'pending', 
          hold_expires_at: futureTime.toISOString()
        })
        .select()
        .single();

      // Run expiration function
      const { data: expiredCount, error } = await supabase.rpc('expire_join_request_holds');

      expect(error).toBeNull();
      expect(expiredCount).toBe(1); // Should expire 1 request

      // Verify statuses
      const { data: requests } = await supabase
        .from('event_join_requests')
        .select('*')
        .eq('event_id', testEventId);

      expect(requests).not.toBeNull();
      const expiredRequest = requests!.find(r => r.user_id === testUserId2);
      const activeRequest = requests!.find(r => r.user_id === 'user-3');

      expect(expiredRequest?.status).toBe('expired');
      expect(activeRequest?.status).toBe('pending'); // Should remain pending
    });

    it('should not expire requests without hold_expires_at', async () => {
      // Create request without expiry time
      await supabase
        .from('event_join_requests')
        .insert({
          event_id: testEventId,
          user_id: testUserId2,
          party_size: 2,
          status: 'pending',
          hold_expires_at: null
        });

      const { data: expiredCount, error } = await supabase.rpc('expire_join_request_holds');

      expect(error).toBeNull();
      expect(expiredCount).toBe(0);

      // Verify status unchanged
      const { data: request } = await supabase
        .from('event_join_requests')
        .select('status')
        .eq('user_id', testUserId2)
        .single();

      expect(request).not.toBeNull();
      expect(request!.status).toBe('pending');
    });

    it('should only expire pending requests', async () => {
      const expiredTime = new Date();
      expiredTime.setMinutes(expiredTime.getMinutes() - 10);

      // Create expired but already approved request
      await supabase
        .from('event_join_requests')
        .insert({
          event_id: testEventId,
          user_id: testUserId2,
          party_size: 2,
          status: 'approved', // Not pending
          hold_expires_at: expiredTime.toISOString()
        });

      const { data: expiredCount, error } = await supabase.rpc('expire_join_request_holds');

      expect(error).toBeNull();
      expect(expiredCount).toBe(0); // Should not expire non-pending requests

      // Verify status unchanged
      const { data: request } = await supabase
        .from('event_join_requests')
        .select('status')
        .eq('user_id', testUserId2)
        .single();

      expect(request).not.toBeNull();
      expect(request!.status).toBe('approved');
    });

    it('should return zero when no requests to expire', async () => {
      const { data: expiredCount, error } = await supabase.rpc('expire_join_request_holds');

      expect(error).toBeNull();
      expect(expiredCount).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete approval workflow with capacity checking', async () => {
      // Create multiple requests
      const holdExpiry = new Date();
      holdExpiry.setMinutes(holdExpiry.getMinutes() + 30);

      const { data: request1 } = await supabase
        .from('event_join_requests')
        .insert({
          event_id: testEventId,
          user_id: testUserId2,
          party_size: 8,
          status: 'pending',
          hold_expires_at: holdExpiry.toISOString()
        })
        .select()
        .single();

      const { data: request2 } = await supabase
        .from('event_join_requests')
        .insert({
          event_id: testEventId,
          user_id: 'user-3',
          party_size: 7,
          status: 'pending',
          hold_expires_at: holdExpiry.toISOString()
        })
        .select()
        .single();

      // Check initial availability (should account for holds)
      let { data: availability } = await supabase.rpc('availability_for_event', {
        event_uuid: testEventId
      });

      expect(availability[0]).toMatchObject({
        total: 15,
        confirmed: 1, // Host
        held: 15, // 8 + 7 = 15
        available: -1 // Over capacity due to holds
      });

      // Approve first request
      await supabase.rpc('update_request_status', {
        request_id: request1.id,
        new_status: 'approved'
      });

      // Check availability after first approval
      ({ data: availability } = await supabase.rpc('availability_for_event', {
        event_uuid: testEventId
      }));

      expect(availability[0]).toMatchObject({
        total: 15,
        confirmed: 9, // 1 + 8
        held: 7, // Only second request
        available: -1 // Still over capacity
      });

      // Try to approve second request (should fail due to capacity)
      const { error } = await supabase.rpc('update_request_status', {
        request_id: request2.id,
        new_status: 'approved'
      });

      expect(error).not.toBeNull();
      expect(error).not.toBeNull();
      expect(error!.message).toContain('Insufficient capacity');

      // Waitlist the second request instead
      const { data: waitlistedRequest } = await supabase.rpc('update_request_status', {
        request_id: request2.id,
        new_status: 'waitlisted'
      });

      expect(waitlistedRequest.status).toBe('waitlisted');

      // Final availability check
      ({ data: availability } = await supabase.rpc('availability_for_event', {
        event_uuid: testEventId
      }));

      expect(availability[0]).toMatchObject({
        total: 15,
        confirmed: 9,
        held: 0, // No more holds
        available: 6
      });
    });
  });
});
