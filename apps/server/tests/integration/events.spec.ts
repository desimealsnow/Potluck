import request from 'supertest';
import { getTestApp } from '../helpers/testApp';
import { getAuthToken, TestDbHelper, TEST_USERS } from '../setup';
import { DbTestHelper } from '../helpers/dbHelpers';
import { EventFactory, TestDataSets, seedFaker } from '../fixtures/factories';
import logger from '../../src/logger';

const app = getTestApp();

describe('Events API Integration Tests', () => {
  let hostToken: string;
  let participantToken: string;
  let outsiderToken: string;

  beforeAll(async () => {
    // Get auth tokens for all test users
    hostToken = await getAuthToken('HOST');
    participantToken = await getAuthToken('PARTICIPANT');
    outsiderToken = await getAuthToken('OUTSIDER');
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await TestDbHelper.cleanupAll();
    await TestDbHelper.seedTestUsers();
  });

  describe('POST /api/v1/events', () => {
    it('should create event with items when authenticated as host', async () => {
      seedFaker(12345); // Deterministic test data
      const eventData = EventFactory.buildDraft();

      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(eventData)
        .expect(201);

      // Verify response structure matches ServiceResult pattern
      expect(response.body).toMatchObject({
        event: expect.objectContaining({
          id: expect.any(String),
          title: eventData.title,
          description: eventData.description,
          status: 'draft',
          created_by: TEST_USERS.HOST.id
        }),
        items: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            category: expect.any(String)
          })
        ])
      });

      // Verify data was actually saved
      await DbTestHelper.assertEventExists(response.body.event.id, {
        title: eventData.title,
        status: 'draft'
      });

      // Verify host was automatically added as participant
      await DbTestHelper.assertParticipantExists(
        response.body.event.id,
        TEST_USERS.HOST.id,
        'accepted'
      );
    });

    it('should reject event creation when not authenticated', async () => {
      const eventData = TestDataSets.minimalEvent();

      const response = await request(app)
        .post('/api/v1/events')
        .send(eventData)
        .expect(401);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('Unauthorized'),
        code: '401'
      });
    });

    it('should reject event with invalid data', async () => {
      const invalidEventData = {
        title: '', // Invalid: empty title
        description: 'Valid description',
        // Missing required fields
      };

      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(invalidEventData)
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('validation'),
        code: '400'
      });
    });

    it('should handle location resolution correctly', async () => {
      const eventData = EventFactory.build({
        location: {
          name: 'Community Center',
          formatted_address: '123 Main St, Anytown, ST 12345'
        }
      });

      const response = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(eventData)
        .expect(201);

      expect(response.body.event.location).toMatchObject({
        name: eventData.location.name,
        formatted_address: eventData.location.formatted_address
      });
    });
  });

  describe('GET /api/v1/events', () => {
    let testEvent: any;

    beforeEach(async () => {
      // Create test event for list tests
      const scenario = await DbTestHelper.createEventScenario(TEST_USERS.HOST.id);
      testEvent = scenario.event;
    });

    it('should list events for authenticated host', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: testEvent.id,
            title: testEvent.title,
            event_date: expect.any(String),
            attendee_count: expect.any(Number)
          })
        ]),
        totalCount: expect.any(Number),
        nextOffset: null // Only one event, so no pagination
      });
    });

    it('should support pagination parameters', async () => {
      const response = await request(app)
        .get('/api/v1/events?limit=1&offset=0')
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.totalCount).toBeGreaterThanOrEqual(1);
    });

    it('should filter events by status', async () => {
      // Create a cancelled event
      const cancelledEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
        status: 'cancelled',
        title: 'Cancelled Event'
      });

      const response = await request(app)
        .get('/api/v1/events?status=cancelled')
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: cancelledEvent.id,
            status: 'cancelled'
          })
        ])
      );
    });

    it('should filter events by date range', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const response = await request(app)
        .get(`/api/v1/events?startsAfter=${futureDate.toISOString()}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      // Should not include our test event (which is in the future but before 30 days)
      expect(response.body.items).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ id: testEvent.id })
        ])
      );
    });

    it('should only show events user has access to', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(200);

      // Outsider should see the event they're invited to but not others
      expect(response.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: testEvent.id })
        ])
      );
    });
  });

  describe('GET /api/v1/events/:id', () => {
    let testScenario: any;

    beforeEach(async () => {
      testScenario = await DbTestHelper.createEventScenario(TEST_USERS.HOST.id);
    });

    it('should return full event details for host', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testScenario.event.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        event: expect.objectContaining({
          id: testScenario.event.id,
          title: testScenario.event.title,
          status: 'published',
          created_by: TEST_USERS.HOST.id
        }),
        items: expect.arrayContaining([
          expect.objectContaining({
            name: 'Main Course',
            category: 'main'
          })
        ]),
        participants: expect.arrayContaining([
          expect.objectContaining({
            user_id: TEST_USERS.HOST.id,
            status: 'accepted'
          }),
          expect.objectContaining({
            user_id: TEST_USERS.PARTICIPANT.id,
            status: 'accepted'
          })
        ])
      });
    });

    it('should return event details for participant', async () => {
      const response = await request(app)
        .get(`/api/v1/events/${testScenario.event.id}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(200);

      // Participant should see full event details
      expect(response.body.event).toMatchObject({
        id: testScenario.event.id,
        title: expect.any(String)
      });
      expect(response.body.items).toHaveLength(3);
      expect(response.body.participants).toHaveLength(3);
    });

    it('should deny access to non-participant', async () => {
      // Create event that outsider is NOT invited to
      const privateEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
        title: 'Private Event'
      });

      const response = await request(app)
        .get(`/api/v1/events/${privateEvent.id}`)
        .set('Authorization', `Bearer ${outsiderToken}`)
        .expect(403);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.any(String),
        code: '403'
      });
    });

    it('should return 404 for non-existent event', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      const response = await request(app)
        .get(`/api/v1/events/${fakeId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Event not found',
        code: '404'
      });
    });
  });

  describe('PATCH /api/v1/events/:id', () => {
    let draftEvent: any;

    beforeEach(async () => {
      draftEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
        status: 'draft',
        title: 'Draft Event'
      });
    });

    it('should allow host to update draft event', async () => {
      const updateData = {
        title: 'Updated Event Title',
        description: 'Updated description',
        min_guests: 10
      };

      const response = await request(app)
        .patch(`/api/v1/events/${draftEvent.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.event).toMatchObject({
        id: draftEvent.id,
        title: updateData.title,
        description: updateData.description,
        min_guests: updateData.min_guests
      });

      // Verify database was updated
      await DbTestHelper.assertEventExists(draftEvent.id, {
        title: updateData.title
      });
    });

    it('should reject non-host update attempts', async () => {
      const updateData = { title: 'Hacked Title' };

      const response = await request(app)
        .patch(`/api/v1/events/${draftEvent.id}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send(updateData)
        .expect(403);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Forbidden',
        code: '403'
      });
    });

    it('should reject updates to cancelled events', async () => {
      const cancelledEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
        status: 'cancelled'
      });

      const response = await request(app)
        .patch(`/api/v1/events/${cancelledEvent.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ title: 'Should not work' })
        .expect(409);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('cancelled'),
        code: '409'
      });
    });
  });

  describe('Event Lifecycle Management', () => {
    let draftEvent: any;

    beforeEach(async () => {
      draftEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
        status: 'draft',
        title: 'Lifecycle Test Event'
      });
    });

    describe('POST /api/v1/events/:id/publish', () => {
      it('should publish draft event', async () => {
        const response = await request(app)
          .post(`/api/v1/events/${draftEvent.id}/publish`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body.event).toMatchObject({
          id: draftEvent.id,
          status: 'published'
        });

        await DbTestHelper.assertEventExists(draftEvent.id, {
          status: 'published'
        });
      });

      it('should reject non-host publish attempts', async () => {
        await request(app)
          .post(`/api/v1/events/${draftEvent.id}/publish`)
          .set('Authorization', `Bearer ${participantToken}`)
          .expect(403);
      });

      it('should reject publish of already published event', async () => {
        // First publish
        await request(app)
          .post(`/api/v1/events/${draftEvent.id}/publish`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        // Second publish should fail
        const response = await request(app)
          .post(`/api/v1/events/${draftEvent.id}/publish`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(409);

        expect(response.body).toMatchObject({
          ok: false,
          code: '409'
        });
      });
    });

    describe('POST /api/v1/events/:id/cancel', () => {
      let publishedEvent: any;

      beforeEach(async () => {
        publishedEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
          status: 'published'
        });
      });

      it('should cancel published event with reason', async () => {
        const cancelData = {
          reason: 'Unexpected weather conditions',
          notifyGuests: true
        };

        const response = await request(app)
          .post(`/api/v1/events/${publishedEvent.id}/cancel`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send(cancelData)
          .expect(200);

        expect(response.body.event).toMatchObject({
          id: publishedEvent.id,
          status: 'cancelled'
        });
      });

      it('should require cancellation reason', async () => {
        const response = await request(app)
          .post(`/api/v1/events/${publishedEvent.id}/cancel`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send({}) // No reason provided
          .expect(400);

        expect(response.body).toMatchObject({
          ok: false,
          error: expect.stringContaining('reason'),
          code: '400'
        });
      });

      it('should only allow cancelling published events', async () => {
        const response = await request(app)
          .post(`/api/v1/events/${draftEvent.id}/cancel`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ reason: 'Test reason' })
          .expect(409);

        expect(response.body.error).toContain('published');
      });
    });

    describe('POST /api/v1/events/:id/complete', () => {
      let publishedEvent: any;

      beforeEach(async () => {
        publishedEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
          status: 'published',
          event_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // Yesterday
        });
      });

      it('should mark published event as completed', async () => {
        const response = await request(app)
          .post(`/api/v1/events/${publishedEvent.id}/complete`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body.event.status).toBe('completed');
        
        await DbTestHelper.assertEventExists(publishedEvent.id, {
          status: 'completed'
        });
      });

      it('should only allow host to complete events', async () => {
        await request(app)
          .post(`/api/v1/events/${publishedEvent.id}/complete`)
          .set('Authorization', `Bearer ${participantToken}`)
          .expect(403);
      });
    });
  });

  describe('DELETE /api/v1/events/:id', () => {
    it('should delete draft event', async () => {
      const draftEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
        status: 'draft'
      });

      await request(app)
        .delete(`/api/v1/events/${draftEvent.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(204);

      // Verify event is deleted
      const count = await DbTestHelper.countRecords('events', { id: draftEvent.id });
      expect(count).toBe(0);
    });

    it('should not delete published events', async () => {
      const publishedEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
        status: 'published'
      });

      const response = await request(app)
        .delete(`/api/v1/events/${publishedEvent.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(409);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('draft'),
        code: '409'
      });
    });

    it('should only allow host to delete events', async () => {
      const draftEvent = await DbTestHelper.insertTestEvent(TEST_USERS.HOST.id, {
        status: 'draft'
      });

      await request(app)
        .delete(`/api/v1/events/${draftEvent.id}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(403);
    });
  });

  afterAll(async () => {
    // Clean up after all tests
    await TestDbHelper.cleanupAll();
  });
});