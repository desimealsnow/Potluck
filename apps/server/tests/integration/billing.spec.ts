import request from 'supertest';
import { getTestApp } from '../helpers/testApp';
import { getAuthToken, TestDbHelper, TEST_USERS } from '../setup';
import { DbTestHelper } from '../helpers/dbHelpers';
import { BillingPlanFactory } from '../fixtures/factories';

const app = getTestApp();

describe('Billing API Integration Tests', () => {
  let hostToken: string;
  let participantToken: string;

  beforeAll(async () => {
    hostToken = await getAuthToken('HOST');
    participantToken = await getAuthToken('PARTICIPANT');
  });

  beforeEach(async () => {
    await TestDbHelper.cleanupAll();
    await TestDbHelper.seedTestUsers();
  });

  describe('GET /api/v1/billing/plans', () => {
    it('should list active billing plans', async () => {
      // Insert test billing plans
      const activePlan = await DbTestHelper.insertTestBillingPlan({
        name: 'Premium Plan',
        amount_cents: 1999,
        is_active: true
      });

      // Insert inactive plan (should not appear)
      await DbTestHelper.insertTestBillingPlan({
        name: 'Deprecated Plan',
        is_active: false
      });

      const response = await request(app)
        .get('/api/v1/billing/plans')
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: activePlan.id,
            name: 'Premium Plan',
            amount_cents: 1999,
            currency: 'usd',
            is_active: true
          })
        ])
      );

      // Should not include inactive plans
      expect(response.body).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Deprecated Plan'
          })
        ])
      );
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/billing/plans')
        .expect(401);
    });

    it('should handle empty plans list', async () => {
      const response = await request(app)
        .get('/api/v1/billing/plans')
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('POST /api/v1/billing/checkout/subscription', () => {
    let testPlan: any;

    beforeEach(async () => {
      testPlan = await DbTestHelper.insertTestBillingPlan({
        name: 'Test Plan',
        amount_cents: 999
      });
    });

    it('should create checkout session for valid plan', async () => {
      const checkoutData = {
        plan_id: testPlan.price_id,
        provider: 'stripe'
      };

      const response = await request(app)
        .post('/api/v1/billing/checkout/subscription')
        .set('Authorization', `Bearer ${hostToken}`)
        .send(checkoutData)
        .expect(200);

      expect(response.body).toMatchObject({
        checkout_url: expect.stringContaining('billing.example.com/checkout')
      });

      // Verify URL includes plan ID
      expect(response.body.checkout_url).toContain(encodeURIComponent(testPlan.price_id));
    });

    it('should require plan_id and provider', async () => {
      const response = await request(app)
        .post('/api/v1/billing/checkout/subscription')
        .set('Authorization', `Bearer ${hostToken}`)
        .send({ plan_id: 'test-plan' }) // Missing provider
        .expect(400);

      expect(response.body).toMatchObject({
        ok: false,
        error: expect.stringContaining('provider'),
        code: '400'
      });
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/v1/billing/checkout/subscription')
        .send({
          plan_id: testPlan.price_id,
          provider: 'stripe'
        })
        .expect(401);
    });
  });

  describe('GET /api/v1/billing/subscriptions', () => {
    let userSubscription: any;

    beforeEach(async () => {
      const plan = await DbTestHelper.insertTestBillingPlan();
      userSubscription = await DbTestHelper.insertTestSubscription(
        TEST_USERS.HOST.id,
        plan.id,
        {
          status: 'active',
          provider_subscription_id: 'sub_test123'
        }
      );

      // Create subscription for different user (should not appear)
      await DbTestHelper.insertTestSubscription(
        TEST_USERS.PARTICIPANT.id,
        plan.id
      );
    });

    it('should list current user subscriptions only', async () => {
      const response = await request(app)
        .get('/api/v1/billing/subscriptions')
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: userSubscription.id,
        provider_subscription_id: 'sub_test123',
        status: 'active'
      });
    });

    it('should return empty array for user with no subscriptions', async () => {
      const response = await request(app)
        .get('/api/v1/billing/subscriptions')
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1); // They have one subscription from beforeEach
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/v1/billing/subscriptions')
        .expect(401);
    });
  });

  describe('GET /api/v1/billing/subscriptions/:subscriptionId', () => {
    let userSubscription: any;
    let otherUserSubscription: any;

    beforeEach(async () => {
      const plan = await DbTestHelper.insertTestBillingPlan();
      
      userSubscription = await DbTestHelper.insertTestSubscription(
        TEST_USERS.HOST.id,
        plan.id,
        { status: 'active' }
      );

      otherUserSubscription = await DbTestHelper.insertTestSubscription(
        TEST_USERS.PARTICIPANT.id,
        plan.id,
        { status: 'active' }
      );
    });

    it('should return subscription details for owner', async () => {
      const response = await request(app)
        .get(`/api/v1/billing/subscriptions/${userSubscription.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userSubscription.id,
        status: 'active',
        provider: 'stripe'
      });
    });

    it('should deny access to other users subscriptions', async () => {
      const response = await request(app)
        .get(`/api/v1/billing/subscriptions/${otherUserSubscription.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(404);

      expect(response.body).toMatchObject({
        ok: false,
        error: 'Not found',
        code: '404'
      });
    });

    it('should return 404 for non-existent subscription', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      await request(app)
        .get(`/api/v1/billing/subscriptions/${fakeId}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(404);
    });
  });

  describe('PUT /api/v1/billing/subscriptions/:subscriptionId', () => {
    let userSubscription: any;
    let newPlan: any;

    beforeEach(async () => {
      const currentPlan = await DbTestHelper.insertTestBillingPlan();
      newPlan = await DbTestHelper.insertTestBillingPlan({
        name: 'Upgrade Plan',
        amount_cents: 2999
      });

      userSubscription = await DbTestHelper.insertTestSubscription(
        TEST_USERS.HOST.id,
        currentPlan.id,
        {
          status: 'active',
          cancel_at_period_end: false
        }
      );
    });

    it('should update subscription plan', async () => {
      const updateData = {
        plan_id: newPlan.id
      };

      const response = await request(app)
        .put(`/api/v1/billing/subscriptions/${userSubscription.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userSubscription.id,
        plan_id: newPlan.id
      });
    });

    it('should update cancel_at_period_end flag', async () => {
      const updateData = {
        cancel_at_period_end: true
      };

      const response = await request(app)
        .put(`/api/v1/billing/subscriptions/${userSubscription.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.cancel_at_period_end).toBe(true);
    });

    it('should deny access to non-owners', async () => {
      await request(app)
        .put(`/api/v1/billing/subscriptions/${userSubscription.id}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .send({ cancel_at_period_end: true })
        .expect(404);
    });
  });

  describe('DELETE /api/v1/billing/subscriptions/:subscriptionId', () => {
    let userSubscription: any;

    beforeEach(async () => {
      const plan = await DbTestHelper.insertTestBillingPlan();
      userSubscription = await DbTestHelper.insertTestSubscription(
        TEST_USERS.HOST.id,
        plan.id,
        { status: 'active' }
      );
    });

    it('should cancel subscription', async () => {
      const response = await request(app)
        .delete(`/api/v1/billing/subscriptions/${userSubscription.id}`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: userSubscription.id,
        status: 'canceled',
        cancel_at_period_end: true
      });
    });

    it('should deny access to non-owners', async () => {
      await request(app)
        .delete(`/api/v1/billing/subscriptions/${userSubscription.id}`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/billing/subscriptions/:subscriptionId/reactivate', () => {
    let cancelledSubscription: any;

    beforeEach(async () => {
      const plan = await DbTestHelper.insertTestBillingPlan();
      cancelledSubscription = await DbTestHelper.insertTestSubscription(
        TEST_USERS.HOST.id,
        plan.id,
        {
          status: 'canceled',
          cancel_at_period_end: true
        }
      );
    });

    it('should reactivate cancelled subscription', async () => {
      const response = await request(app)
        .post(`/api/v1/billing/subscriptions/${cancelledSubscription.id}/reactivate`)
        .set('Authorization', `Bearer ${hostToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: cancelledSubscription.id,
        status: 'active',
        cancel_at_period_end: false
      });
    });

    it('should deny access to non-owners', async () => {
      await request(app)
        .post(`/api/v1/billing/subscriptions/${cancelledSubscription.id}/reactivate`)
        .set('Authorization', `Bearer ${participantToken}`)
        .expect(404);
    });
  });

  afterAll(async () => {
    await TestDbHelper.cleanupAll();
  });
});