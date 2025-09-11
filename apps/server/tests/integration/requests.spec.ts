import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { supabase } from '../../src/config/supabaseClient';
import { createTestApp, cleanupTestData, createTestUser, createTestEvent } from '../helpers/testApp';

describe('Join Requests API Integration', () => {
  let testApp: any;
  let hostToken: string;
  let guestToken: string;
  let hostUserId: string;
  let guestUserId: string;
  let testEventId: string;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  beforeEach(async () => {
    // Create test users
    const hostUser = await createTestUser('host@example.com', 'password123');
    const guestUser = await createTestUser('guest@example.com', 'password123');
    
    hostToken = hostUser.token;
    guestToken = guestUser.token;
    hostUserId = hostUser.userId;
    guestUserId = guestUser.userId;

    // Create test event with capacity
    const eventData = {
      title: 'Test Event',
      description: 'Test event for join requests',
      event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week future
      min_guests: 5,
      max_guests: 20,
      capacity_total: 15,
      meal_type: 'mixed',
      is_public: true,
      location: {
        name: 'Test Venue',
        formatted_address: '123 Test St, Test City'
      },
      items: [{
        name: 'Main Course',
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
    // Clean up test data after each test
    await supabase
      .from('event_join_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
  });

  describe('GET /events/:eventId/availability', () => {
    it('should return availability data for public event', async () => {
      const response = await request(testApp)
        .get(`/api/v1/events/${testEventId}/availability`)
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('confirmed');  
      expect(response.body).toHaveProperty('held');
      expect(response.body).toHaveProperty('available');
      expect(response.body.total).toBe(15);
      expect(response.body.confirmed).toBe(1); // Host is auto-participant
      expect(response.body.available).toBe(14);
    });

    it('should return 404 for non-existent event', async () => {
      await request(testApp)
        .get('/api/v1/events/00000000-0000-0000-0000-000000000000/availability')
        .expect(404);
    });
  });

  describe('POST /events/:eventId/requests', () => {
    it('should create join request successfully', async () => {
      const requestData = {
        party_size: 2,
        note: 'Looking forward to joining!'
      };

      const response = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send(requestData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.event_id).toBe(testEventId);
      expect(response.body.user_id).toBe(guestUserId);
      expect(response.body.party_size).toBe(2);
      expect(response.body.note).toBe('Looking forward to joining!');
      expect(response.body.status).toBe('pending');
      expect(response.body).toHaveProperty('hold_expires_at');
    });

    it('should reject duplicate requests', async () => {
      const requestData = { party_size: 1 };

      // First request should succeed
      await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send(requestData)
        .expect(201);

      // Second request should fail
      await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send(requestData)
        .expect(409);
    });

    it('should reject requests exceeding capacity', async () => {
      const requestData = { party_size: 20 }; // More than available capacity

      await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send(requestData)
        .expect(409);
    });

    it('should require authentication', async () => {
      const requestData = { party_size: 1 };

      await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .send(requestData)
        .expect(401);
    });

    it('should validate request data', async () => {
      // Missing party_size
      await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({})
        .expect(400);

      // Invalid party_size  
      await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ party_size: 0 })
        .expect(400);
    });
  });

  describe('GET /events/:eventId/requests', () => {
    let requestId: string;

    beforeEach(async () => {
      // Create a test request
      const response = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ party_size: 2 });
      requestId = response.body.id;
    });

    it('should list requests for event host', async () => {
      const response = await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('totalCount');
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe(requestId);
    });

    it('should support status filtering', async () => {
      const response = await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests?status=pending`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].status).toBe('pending');
    });

    it('should support pagination', async () => {
      const response = await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests?limit=5&offset=0`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.totalCount).toBe(1);
    });

    it('should require host authentication', async () => {
      // Guest should not be able to list requests
      await request(testApp)
        .get(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guestToken}`)
        .expect(403);
    });
  });

  describe('Request status transitions', () => {
    let requestId: string;

    beforeEach(async () => {
      const response = await request(testApp)
        .post(`/api/v1/events/${testEventId}/requests`)
        .set('Authorization', `Bearer ${guestToken}`)
        .send({ party_size: 2 });
      requestId = response.body.id;
    });

    describe('PATCH /events/:eventId/requests/:requestId/approve', () => {
      it('should approve request and create participant', async () => {
        const response = await request(testApp)
          .patch(`/api/v1/events/${testEventId}/requests/${requestId}/approve`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body.status).toBe('approved');

        // Verify participant was created
        const participants = await request(testApp)
          .get(`/api/v1/events/${testEventId}/participants`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        const guestParticipant = participants.body.find((p: any) => p.user_id === guestUserId);
        expect(guestParticipant).toBeDefined();
        expect(guestParticipant.status).toBe('accepted');
        expect(guestParticipant.party_size).toBe(2);
      });

      it('should require host permissions', async () => {
        await request(testApp)
          .patch(`/api/v1/events/${testEventId}/requests/${requestId}/approve`)
          .set('Authorization', `Bearer ${guestToken}`)
          .expect(403);
      });
    });

    describe('PATCH /events/:eventId/requests/:requestId/decline', () => {
      it('should decline request successfully', async () => {
        const response = await request(testApp)
          .patch(`/api/v1/events/${testEventId}/requests/${requestId}/decline`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body.status).toBe('declined');
      });
    });

    describe('PATCH /events/:eventId/requests/:requestId/waitlist', () => {
      it('should waitlist request successfully', async () => {
        const response = await request(testApp)
          .patch(`/api/v1/events/${testEventId}/requests/${requestId}/waitlist`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body.status).toBe('waitlisted');
      });
    });

    describe('PATCH /events/:eventId/requests/:requestId/cancel', () => {
      it('should allow guest to cancel own request', async () => {
        const response = await request(testApp)
          .patch(`/api/v1/events/${testEventId}/requests/${requestId}/cancel`)
          .set('Authorization', `Bearer ${guestToken}`)
          .expect(200);

        expect(response.body.status).toBe('cancelled');
      });

      it('should prevent canceling other user\'s request', async () => {
        await request(testApp)
          .patch(`/api/v1/events/${testEventId}/requests/${requestId}/cancel`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(403);
      });
    });

    describe('POST /events/:eventId/requests/:requestId/extend', () => {
      it('should extend hold successfully', async () => {
        const response = await request(testApp)
          .post(`/api/v1/events/${testEventId}/requests/${requestId}/extend`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ extension_minutes: 60 })
          .expect(200);

        expect(response.body).toHaveProperty('hold_expires_at');
        
        // Verify the expiry was extended (roughly)
        const newExpiry = new Date(response.body.hold_expires_at);
        const expectedMinExpiry = new Date(Date.now() + 50 * 60 * 1000); // At least 50 min future
        expect(newExpiry.getTime()).toBeGreaterThan(expectedMinExpiry.getTime());
      });

      it('should validate extension duration', async () => {
        await request(testApp)
          .post(`/api/v1/events/${testEventId}/requests/${requestId}/extend`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ extension_minutes: 200 }) // Too long
          .expect(400);
      });

      it('should require host permissions', async () => {
        await request(testApp)
          .post(`/api/v1/events/${testEventId}/requests/${requestId}/extend`)
          .set('Authorization', `Bearer ${guestToken}`)
          .expect(403);
      });
    });
  });
});
