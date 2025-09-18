import { describe, it, expect, beforeAll, beforeEach, afterAll } from '@jest/globals';
import request from 'supertest';
import { getTestApp } from '../helpers/testApp';
import { getAuthToken, TestDbHelper, TEST_USERS, testSupabase } from '../setup';
import { DbTestHelper } from '../helpers/dbHelpers';
import logger from '../../src/logger';

const app = getTestApp();

// Test users with nearby locations in San Francisco area
const LOCATION_TEST_USERS = {
  HOST_SF: {
    email: 'host-sf@test.dev',
    password: 'password123',
    id: '11111111-1111-1111-1111-111111111111',
    location: {
      latitude: 37.7749,  // San Francisco downtown
      longitude: -122.4194,
      city: 'San Francisco',
      discoverability_enabled: true,
      discoverability_radius_km: 25
    }
  },
  NEARBY_USER: {
    email: 'nearby-user@test.dev',
    password: 'password123',
    id: '22222222-2222-2222-2222-222222222222',
    location: {
      latitude: 37.7849,  // ~1km away from host
      longitude: -122.4094,
      city: 'San Francisco',
      discoverability_enabled: true,
      discoverability_radius_km: 30
    }
  },
  FAR_USER: {
    email: 'far-user@test.dev',
    password: 'password123',
    id: '33333333-3333-3333-3333-333333333333',
    location: {
      latitude: 37.9049,  // ~15km away (outside default radius)
      longitude: -122.3094,
      city: 'Oakland',
      discoverability_enabled: true,
      discoverability_radius_km: 10
    }
  }
};

describe('🗺️ Location-Based Event Discovery & Notifications', () => {
  let hostToken: string;
  let nearbyUserToken: string;
  let farUserToken: string;
  let realIds: { HOST: string; NEARBY: string; FAR: string };

  beforeAll(async () => {
    // Get auth tokens for all test users
    hostToken = await getAuthToken('HOST');
    nearbyUserToken = await getAuthToken('PARTICIPANT');
    farUserToken = await getAuthToken('OUTSIDER');
    // Decode JWTs to obtain real auth user IDs (to satisfy FK on user_profiles.id)
    const decodeSub = (jwt: string) => {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
      return payload.sub as string;
    };
    realIds = {
      HOST: decodeSub(hostToken),
      NEARBY: decodeSub(nearbyUserToken),
      FAR: decodeSub(farUserToken)
    };
    
    logger.info('✅ Location test users authenticated');
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await TestDbHelper.cleanupAll();
    await TestDbHelper.seedTestUsers();
    
    // Set up user locations
    await setupUserLocations();
  });

  async function setupUserLocations() {
    const supabase = testSupabase;
    
    // Update user profiles with location data
    for (const [key, user] of Object.entries(LOCATION_TEST_USERS)) {
      const realId = key === 'HOST_SF' ? realIds.HOST : key === 'NEARBY_USER' ? realIds.NEARBY : realIds.FAR;
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: realId,
          user_id: realId,
          home_geog: `SRID=4326;POINT(${user.location.longitude} ${user.location.latitude})`,
          city: user.location.city,
          discoverability_enabled: user.location.discoverability_enabled,
          discoverability_radius_km: user.location.discoverability_radius_km,
          geo_precision: 'exact'
        });

      if (error) {
        logger.error(`Failed to set location for ${key}:`, error);
        throw error;
      }
    }
    
    logger.info('✅ User locations configured');
  }

  describe('📍 Location-Based Event Search', () => {
    let testEvent: any;

    beforeEach(async () => {
      // Create a public event with location data
      testEvent = await createEventWithLocation({
        title: 'Community Potluck in SF',
        description: 'A great community gathering',
        latitude: 37.7799,  // Between the two nearby users
        longitude: -122.4149,
        city: 'San Francisco',
        is_public: true,
        visibility_radius_km: 20
      });
    });

    it('should find nearby events using coordinates', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${nearbyUserToken}`)
        .query({
          lat: LOCATION_TEST_USERS.NEARBY_USER.location.latitude,
          lon: LOCATION_TEST_USERS.NEARBY_USER.location.longitude,
          radius_km: 25,
          is_public: true
        })
        .expect(200);

      expect(response.body).toMatchObject({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: testEvent.id,
            title: 'Community Potluck in SF'
          })
        ]),
        totalCount: expect.any(Number)
      });

      // Verify distance is calculated and included
      const event = response.body.items.find((e: any) => e.id === testEvent.id);
      expect(event).toBeDefined();
      // Distance should be small since users are close
      expect(event.distance_m).toBeLessThan(5000); // Less than 5km
    });

    it('should find events by city name', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${nearbyUserToken}`)
        .query({
          near: 'San Francisco',
          is_public: true
        })
        .expect(200);

      expect(response.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: testEvent.id,
            title: 'Community Potluck in SF'
          })
        ])
      );
    });

    it('should respect radius limits', async () => {
      // Search with very small radius
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${farUserToken}`)
        .query({
          lat: LOCATION_TEST_USERS.FAR_USER.location.latitude,
          lon: LOCATION_TEST_USERS.FAR_USER.location.longitude,
          radius_km: 5,  // Very small radius
          is_public: true
        })
        .expect(200);

      // Should not find the event since it's outside the radius
      expect(response.body.items).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ id: testEvent.id })
        ])
      );
    });

    it('should combine location search with text filters', async () => {
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${nearbyUserToken}`)
        .query({
          lat: LOCATION_TEST_USERS.NEARBY_USER.location.latitude,
          lon: LOCATION_TEST_USERS.NEARBY_USER.location.longitude,
          radius_km: 25,
          q: 'potluck',  // Text search
          is_public: true
        })
        .expect(200);

      expect(response.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: testEvent.id,
            title: expect.stringContaining('Potluck')
          })
        ])
      );
    });
  });

  describe('🔔 Location-Based Notifications', () => {
    it('should send notifications to nearby users when event is published', async () => {
      // Create a draft event with location
      const eventData = {
        title: 'New Community Event',
        description: 'A new event in the neighborhood',
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        location: {
          name: 'Community Center',
          formatted_address: '123 Main St, San Francisco, CA'
        },
        latitude: 37.7799,
        longitude: -122.4149,
        city: 'San Francisco',
        is_public: true,
        visibility_radius_km: 20
      };

      // Create the event
      const createResponse = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(eventData)
        .expect(201);

      const eventId = createResponse.body.event.id;

      // Publish the event (this should trigger notifications)
      await request(app)
        .post(`/api/v1/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      // Wait a moment for notifications to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if nearby user received notification
      const notificationsResponse = await request(app)
        .get('/api/v1/discovery/notifications')
        .set('Authorization', `Bearer ${nearbyUserToken}`)
        .expect(200);

      expect(notificationsResponse.body).toMatchObject({
        notifications: expect.arrayContaining([
          expect.objectContaining({
            type: 'event_created',
            event_id: eventId,
            payload: expect.objectContaining({
              event_title: 'New Community Event',
              reason: 'nearby',
              distance_km: expect.any(Number)
            })
          })
        ])
      });

      // Verify the notification includes distance information
      const notification = notificationsResponse.body.notifications.find(
        (n: any) => n.event_id === eventId
      );
      expect(notification).toBeDefined();
      expect(notification.payload.distance_km).toBeLessThan(5); // Should be close
    });

    it('should not send notifications to users outside radius', async () => {
      // Create and publish an event
      const eventData = {
        title: 'Local Event',
        description: 'A local gathering',
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: {
          name: 'Local Venue',
          formatted_address: '123 Main St, San Francisco, CA'
        },
        latitude: 37.7799,
        longitude: -122.4149,
        city: 'San Francisco',
        is_public: true,
        visibility_radius_km: 5  // Small radius
      };

      const createResponse = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(eventData)
        .expect(201);

      const eventId = createResponse.body.event.id;

      await request(app)
        .post(`/api/v1/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      // Wait for notifications to be processed
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Far user should not receive notification
      const farUserNotifications = await request(app)
        .get('/api/v1/discovery/notifications')
        .set('Authorization', `Bearer ${farUserToken}`)
        .expect(200);

      expect(farUserNotifications.body.notifications).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ event_id: eventId })
        ])
      );
    });

    it('should respect user discoverability settings', async () => {
      // Disable discoverability for nearby user
      const supabase = testSupabase;
      await supabase
        .from('user_profiles')
        .update({ discoverability_enabled: false })
        .eq('user_id', realIds.NEARBY);

      // Create and publish event
      const eventData = {
        title: 'Test Event',
        description: 'Testing discoverability',
        event_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        location: {
          name: 'Test Venue',
          formatted_address: '123 Test St, San Francisco, CA'
        },
        latitude: 37.7799,
        longitude: -122.4149,
        city: 'San Francisco',
        is_public: true,
        visibility_radius_km: 20
      };

      const createResponse = await request(app)
        .post('/api/v1/events')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(eventData)
        .expect(201);

      const eventId = createResponse.body.event.id;

      await request(app)
        .post(`/api/v1/events/${eventId}/publish`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      // Wait for notifications
      await new Promise(resolve => setTimeout(resolve, 1000));

      // User with disabled discoverability should not receive notification
      const notificationsResponse = await request(app)
        .get('/api/v1/discovery/notifications')
        .set('Authorization', `Bearer ${nearbyUserToken}`)
        .expect(200);

      expect(notificationsResponse.body.notifications).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ event_id: eventId })
        ])
      );
    });
  });

  describe('🔍 Advanced Location Features', () => {
    it('should handle edge cases in location search', async () => {
      // Test with invalid coordinates
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${nearbyUserToken}`)
        .query({
          lat: 999,  // Invalid latitude
          lon: -122.4194,
          is_public: true
        })
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('Invalid')
      });
    });

    it('should handle empty search results gracefully', async () => {
      // Search in a location with no events
      const response = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${nearbyUserToken}`)
        .query({
          lat: 40.7128,  // New York coordinates
          lon: -74.0060,
          radius_km: 10,
          is_public: true
        })
        .expect(200);

      expect(response.body).toMatchObject({
        items: [],
        totalCount: 0
      });
    });

    it('should support different radius values', async () => {
      const event = await createEventWithLocation({
        title: 'Radius Test Event',
        latitude: 37.7849,  // Close to nearby user
        longitude: -122.4094,
        city: 'San Francisco',
        is_public: true,
        visibility_radius_km: 1  // Very small radius
      });

      // Search with larger radius - should find event
      const largeRadiusResponse = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${nearbyUserToken}`)
        .query({
          lat: LOCATION_TEST_USERS.NEARBY_USER.location.latitude,
          lon: LOCATION_TEST_USERS.NEARBY_USER.location.longitude,
          radius_km: 10,
          is_public: true
        })
        .expect(200);

      expect(largeRadiusResponse.body.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: event.id })
        ])
      );

      // Search with smaller radius - should not find event
      const smallRadiusResponse = await request(app)
        .get('/api/v1/events')
        .set('Authorization', `Bearer ${nearbyUserToken}`)
        .query({
          lat: LOCATION_TEST_USERS.NEARBY_USER.location.latitude,
          lon: LOCATION_TEST_USERS.NEARBY_USER.location.longitude,
          radius_km: 0.5,  // Very small radius
          is_public: true
        })
        .expect(200);

      expect(smallRadiusResponse.body.items).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ id: event.id })
        ])
      );
    });
  });

  // Helper function to create events with location data
  async function createEventWithLocation(eventData: any) {
    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        title: eventData.title,
        description: eventData.description || 'Test event description',
        event_date: eventData.event_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        // Required fields for validation
        min_guests: eventData.min_guests || 5,
        capacity_total: eventData.capacity_total || 20,
        meal_type: eventData.meal_type || 'mixed',
        items: eventData.items || [
          { name: 'Main Course', category: 'main', per_guest_qty: 1, required_qty: 5 }
        ],
        location: eventData.location || {
          name: 'Test Venue',
          formatted_address: '123 Test St, San Francisco, CA'
        },
        latitude: eventData.latitude,
        longitude: eventData.longitude,
        city: eventData.city,
        is_public: eventData.is_public || false,
        visibility_radius_km: eventData.visibility_radius_km || 25
      });

    if (response.status !== 201) {
      // Log server error to diagnose 500/400
      // eslint-disable-next-line no-console
      console.log('[TEST] Event create failed:', response.status, response.body);
    }

    expect(response.status).toBe(201);

    // Publish the event
    await request(app)
      .post(`/api/v1/events/${response.body.event.id}/publish`)
      .set('Authorization', `Bearer ${hostToken}`)
      .expect(200);

    return response.body.event;
  }

  afterAll(async () => {
    // Clean up after all tests
    await TestDbHelper.cleanupAll();
  });
});
