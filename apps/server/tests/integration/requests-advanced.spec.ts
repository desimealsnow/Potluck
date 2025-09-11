import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { supabase } from '../../src/config/supabaseClient';
import { getTestApp } from '../helpers/testApp';
import { getAuthToken, TEST_USERS, TestDbHelper } from '../setup';

describe('Join Requests - Advanced Integration Tests', () => {
  let testApp: any;
  let hostToken: string;
  let guest1Token: string;
  let guest2Token: string;
  let guest3Token: string;
  let hostUserId: string;
  let guest1UserId: string;
  let guest2UserId: string;
  let guest3UserId: string;
  let testEventId: string;

  beforeAll(async () => {
    testApp = getTestApp();
  });

  afterAll(async () => {
    await TestDbHelper.cleanupAll();
  });

  beforeEach(async () => {
    // Use seeded users and tokens
    hostToken = await getAuthToken('HOST');
    guest1Token = await getAuthToken('PARTICIPANT');
    guest2Token = await getAuthToken('OUTSIDER');
    guest3Token = await getAuthToken('ADMIN');
    
    hostUserId = TEST_USERS.HOST.id;
    guest1UserId = TEST_USERS.PARTICIPANT.id;
    guest2UserId = TEST_USERS.OUTSIDER.id;
    guest3UserId = TEST_USERS.ADMIN.id;

    // Create test event with limited capacity
    const eventData = {
      title: 'Capacity Test Event',
      description: 'Event for testing capacity management',
      event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      min_guests: 3,
      max_guests: 10,
      capacity_total: 8, // Limited capacity
      meal_type: 'mixed',
      is_public: true,
      location: {
        name: 'Small Venue',
        formatted_address: '456 Cozy St, Test City'
      },
      items: [{
        name: 'Appetizer',
        category: 'food',
        per_guest_qty: 1
      }]
    };

    const eventResponse = await request(testApp)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${hostToken}`)
      .send(eventData)
      .expect(201);

    testEventId = eventResponse.body.event.id;
  });

  afterEach(async () => {
    await TestDbHelper.cleanupAll();
  });

  describe('Capacity Management Scenarios', () => {
    it('should handle multiple concurrent requests within capacity', async () => {
      // Create multiple requests simultaneously
      const requestPromises = [
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest1Token}`)
          .send({ party_size: 2, note: 'Guest 1 request' }),
        
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest2Token}`)
          .send({ party_size: 2, note: 'Guest 2 request' }),
        
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest3Token}`)
          .send({ party_size: 3, note: 'Guest 3 request' })
      ];

      const responses = await Promise.all(requestPromises);

      // All should succeed (7 total requested vs 8 capacity, with 1 host = 7 available)
      responses.forEach(res => {
        expect(res.status).toBe(201);
        expect(res.body.status).toBe('pending');
      });

      // Check availability reflects all holds
      const availabilityResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/availability`);

      expect(availabilityResponse.body).toMatchObject({
        total: 8,
        confirmed: 1, // Host
        held: 7, // 2 + 2 + 3
        available: 0 // No more capacity
      });
    });

    it('should handle capacity overflow with holds', async () => {
      // First, create requests that fill capacity with holds
      await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ party_size: 4 });

      await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest2Token}`)
        .send({ party_size: 3 });

      // This should fail due to capacity (4 + 3 = 7, plus 1 host = 8, no room left)
      const overflowResponse = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest3Token}`)
        .send({ party_size: 1 })
        .expect(409);

      expect(overflowResponse.body.error).toContain('capacity');
    });

    it('should handle approval race conditions correctly', async () => {
      // Create two requests that together exceed capacity
      const request1Response = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ party_size: 5 });

      const request2Response = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest2Token}`)
        .send({ party_size: 4 });

      const request1Id = request1Response.body.id;
      const request2Id = request2Response.body.id;

      // Try to approve both simultaneously
      const approvalPromises = [
        request(testApp)
          .patch(`/api/v1/events/${testEventId}/requests/${request1Id}/approve`)
          .set('Authorization', `Bearer ${hostToken}`),
        
        request(testApp)
          .patch(`/api/v1/events/${testEventId}/requests/${request2Id}/approve`)
          .set('Authorization', `Bearer ${hostToken}`)
      ];

      const approvalResponses = await Promise.all(approvalPromises.map(p => 
        p.then(res => ({ ok: true as const, res }))
         .catch(err => ({ ok: false as const, err }))
      ));

      // One should succeed, one should fail due to capacity
      const successes = approvalResponses.filter(r => r.ok && (r as any).res.status === 200);
      const failures = approvalResponses.filter(r => !r.ok || (r as any).res.status !== 200);

      expect(successes).toHaveLength(1);
      expect(failures).toHaveLength(1);
      
      // The successful one should have created a participant
      const participantsResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/participants`)
        .set('Authorization', `Bearer ${hostToken}`);

      // Should be 2 participants: host + 1 approved guest  
      expect(participantsResponse.body).toHaveLength(2);
    });
  });

  describe('Hold Expiration Scenarios', () => {
    it('should not count expired holds in availability', async () => {
      // Create a request
      const requestResponse = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ party_size: 3 });

      const requestId = requestResponse.body.id;

      // Manually expire the hold by updating the database
      await supabase
        .from('event_join_requests')
        .update({
          hold_expires_at: new Date(Date.now() - 60000).toISOString() // 1 minute ago
        })
        .eq('id', requestId);

      // Availability should not count the expired hold
      const availabilityResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/availability`);

      expect(availabilityResponse.body).toMatchObject({
        total: 8,
        confirmed: 1,
        held: 0, // Expired hold not counted
        available: 7
      });

      // New request should succeed even though previous request exists
      await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest2Token}`)
        .send({ party_size: 6 })
        .expect(201);
    });
  });

  describe('Complex Workflow Scenarios', () => {
    it('should handle mixed approval, decline, and waitlist actions', async () => {
      // Create multiple requests
      const requests = await Promise.all([
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest1Token}`)
          .send({ party_size: 2, note: 'First request' }),
        
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest2Token}`)
          .send({ party_size: 3, note: 'Second request' }),
        
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest3Token}`)
          .send({ party_size: 4, note: 'Third request' })
      ]);

      const [request1, request2, request3] = requests.map(r => r.body);

      // Approve first request
      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${request1.id}/approve`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      // Decline second request  
      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${request2.id}/decline`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      // Waitlist third request (would exceed remaining capacity)
      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${request3.id}/waitlist`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      // Check final state
      const requestsResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${hostToken}`);

      const finalRequests = requestsResponse.body.data;
      expect(finalRequests.find((r: any) => r.id === request1.id).status).toBe('approved');
      expect(finalRequests.find((r: any) => r.id === request2.id).status).toBe('declined');
      expect(finalRequests.find((r: any) => r.id === request3.id).status).toBe('waitlisted');

      // Check availability
      const availabilityResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/availability`);

      expect(availabilityResponse.body).toMatchObject({
        total: 8,
        confirmed: 3, // Host + approved guest (party_size: 2)
        held: 0, // No pending holds
        available: 5
      });

      // Check participants
      const participantsResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/participants`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(participantsResponse.body).toHaveLength(2); // Host + 1 approved guest
    });

    it('should handle request cancellation and capacity recalculation', async () => {
      // Create and approve a request
      const requestResponse = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ party_size: 4 });

      const requestId = requestResponse.body.id;

      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${hostToken}`);

      // Check capacity after approval
      let availabilityResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/availability`);

      expect(availabilityResponse.body.confirmed).toBe(5); // 1 + 4
      expect(availabilityResponse.body.available).toBe(3);

      // Create a new pending request from another user
      const pendingRequestResponse = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest2Token}`)
        .send({ party_size: 2 });

      const pendingRequestId = pendingRequestResponse.body.id;

      // Cancel the pending request
      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${pendingRequestId}/cancel`)
        .set('Authorization', `Bearer ${guest2Token}`)
        .expect(200);

      // Availability should reflect the cancelled hold
      availabilityResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/availability`);

      expect(availabilityResponse.body).toMatchObject({
        confirmed: 5,
        held: 0, // Cancelled request hold removed
        available: 3
      });
    });
  });

  describe('Hold Extension Scenarios', () => {
    it('should extend hold and update expiration', async () => {
      // Create a request
      const requestResponse = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ party_size: 2 });

      const requestId = requestResponse.body.id;
      const originalExpiry = new Date(requestResponse.body.hold_expires_at);

      // Wait a moment to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 100));

      // Extend the hold
      const extendResponse = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests/${requestId}/extend`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ extension_minutes: 60 })
        .expect(200);

      const newExpiry = new Date(extendResponse.body.hold_expires_at);
      expect(newExpiry.getTime()).toBeGreaterThan(originalExpiry.getTime());

      // Verify the hold is still counted in availability
      const availabilityResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/availability`);

      expect(availabilityResponse.body.held).toBe(2);
    });
  });

  describe('Filtering and Pagination', () => {
    it('should filter requests by status', async () => {
      // Create and process multiple requests with different outcomes
      const requests = await Promise.all([
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest1Token}`)
          .send({ party_size: 1 }),
        
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest2Token}`)
          .send({ party_size: 1 }),
        
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest3Token}`)
          .send({ party_size: 1 })
      ]);

      // Approve one, decline one, leave one pending
      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${requests[0].body.id}/approve`)
        .set('Authorization', `Bearer ${hostToken}`);

      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${requests[1].body.id}/decline`)
        .set('Authorization', `Bearer ${hostToken}`);

      // Filter by each status
      const pendingResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests?status=pending`)
        .set('Authorization', `Bearer ${hostToken}`);

      const approvedResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests?status=approved`)
        .set('Authorization', `Bearer ${hostToken}`);

      const declinedResponse = await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests?status=declined`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(pendingResponse.body.data).toHaveLength(1);
      expect(approvedResponse.body.data).toHaveLength(1);
      expect(declinedResponse.body.data).toHaveLength(1);

      expect(pendingResponse.body.data[0].status).toBe('pending');
      expect(approvedResponse.body.data[0].status).toBe('approved');
      expect(declinedResponse.body.data[0].status).toBe('declined');
    });

    it('should paginate requests correctly', async () => {
      // Create multiple requests
      const createPromises = Array.from({ length: 5 }, (_, i) => 
        request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest1Token}`) // Same user, multiple requests (for testing)
          .send({ party_size: 1, note: `Request ${i + 1}` })
      );

      await Promise.allSettled(createPromises); // Some may fail due to duplicates, that's ok

      // Test pagination
      const page1Response = await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests?limit=2&offset=0`)
        .set('Authorization', `Bearer ${hostToken}`);

      const page2Response = await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests?limit=2&offset=2`)
        .set('Authorization', `Bearer ${hostToken}`);

      expect(page1Response.body.data).toHaveLength(2);
      expect(page1Response.body.totalCount).toBeGreaterThan(2);
      expect(page1Response.body.nextOffset).toBe(2);

      if (page2Response.body.data.length > 0) {
        // Ensure no overlap between pages
        const page1Ids = page1Response.body.data.map((r: any) => r.id);
        const page2Ids = page2Response.body.data.map((r: any) => r.id);
        expect(page1Ids.some((id: string) => page2Ids.includes(id))).toBe(false);
      }
    });
  });

  describe('Error Edge Cases', () => {
    it('should handle malformed request data gracefully', async () => {
      const malformedRequests = [
        { party_size: 'invalid' },
        { party_size: -1 },
        { party_size: 1.5 },
        { note: 'a'.repeat(501) }, // Too long
        {} // Missing required fields
      ];

      for (const data of malformedRequests) {
        await request(testApp)
          .post(`/api/v1/events/${testEventId}/requests`)
          .set('Authorization', `Bearer ${guest1Token}`)
          .send(data)
          .expect(400);
      }
    });

    it('should handle operations on non-existent requests', async () => {
      const fakeRequestId = '00000000-0000-0000-0000-000000000000';

      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${fakeRequestId}/approve`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(404);

      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${fakeRequestId}/decline`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(404);

      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${fakeRequestId}/cancel`)
        .set('Authorization', `Bearer ${guest1Token}`)
        .expect(404);
    });

    it('should prevent unauthorized operations', async () => {
      // Create a request
      const requestResponse = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guest1Token}`)
        .send({ party_size: 2 });

      const requestId = requestResponse.body.id;

      // Try to approve as non-host
      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${requestId}/approve`)
        .set('Authorization', `Bearer ${guest2Token}`)
        .expect(403);

      // Try to cancel someone else's request
      await request(testApp)
        .patch(`/api/v1/events/${testEventId}/requests/${requestId}/cancel`)
        .set('Authorization', `Bearer ${guest2Token}`)
        .expect(403);
    });
  });
});
