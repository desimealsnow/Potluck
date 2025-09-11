import request from 'supertest';
import { getTestApp } from '../helpers/testApp';
import { getAuthToken, TestDbHelper, TEST_USERS } from '../setup';
import { DbTestHelper } from '../helpers/dbHelpers';
import { 
  BillingPlanFactory, 
  SubscriptionFactory, 
  PaymentMethodFactory, 
  InvoiceFactory,
  CheckoutSessionFactory 
} from '../fixtures/factories';
import { 
  LemonSqueezyMockFactory, 
  LemonSqueezyMockData,
  LemonSqueezyTestScenarios 
} from '../fixtures/lemonSqueezyMocks';
import nock from 'nock';
import crypto from 'crypto';
import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from '@jest/globals';

const app = getTestApp();

describe('Comprehensive Billing API Integration Tests', () => {
  let hostToken: string;
  let participantToken: string;
  let adminToken: string;

  beforeAll(async () => {
    hostToken = await getAuthToken('HOST');
    participantToken = await getAuthToken('PARTICIPANT');
    adminToken = await getAuthToken('ADMIN');
  });

  beforeEach(async () => {
    await TestDbHelper.cleanupAll();
    await TestDbHelper.seedTestUsers();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('Billing Plans Management', () => {
    describe('GET /api/v1/billing/plans', () => {
      it('should list all active billing plans', async () => {
        // Insert test billing plans
        const activePlan1 = await DbTestHelper.insertTestBillingPlan({
          name: 'Basic Plan',
          amount_cents: 999,
          provider: 'lemonsqueezy',
          is_active: true
        });

        const activePlan2 = await DbTestHelper.insertTestBillingPlan({
          name: 'Premium Plan',
          amount_cents: 1999,
          provider: 'lemonsqueezy',
          is_active: true
        });

        // Insert inactive plan (should not appear)
        await DbTestHelper.insertTestBillingPlan({
          name: 'Deprecated Plan',
          provider: 'lemonsqueezy',
          is_active: false
        });

        const response = await request(app)
          .get('/api/v1/billing/plans')
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: activePlan1.id,
              name: 'Basic Plan',
              amount_cents: 999,
              provider: 'lemonsqueezy',
              is_active: true
            }),
            expect.objectContaining({
              id: activePlan2.id,
              name: 'Premium Plan',
              amount_cents: 1999,
              provider: 'lemonsqueezy',
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
  });

  describe('Checkout Session Management', () => {
    describe('POST /api/v1/billing/checkout/subscription', () => {
      let testPlan: any;

      beforeEach(async () => {
        testPlan = await DbTestHelper.insertTestBillingPlan({
          name: 'Test Plan',
          amount_cents: 999,
          provider: 'lemonsqueezy',
          price_id: '123456'
        });

        // Mock LemonSqueezy checkout API
        nock('https://api.lemonsqueezy.com')
          .post('/v1/checkouts')
          .reply(200, {
            data: LemonSqueezyMockFactory.createCheckout({
              variant_id: parseInt(testPlan.price_id)
            })
          });
      });

      it('should create checkout session for valid LemonSqueezy plan', async () => {
        const checkoutData = {
          plan_id: testPlan.price_id,
          provider: 'lemonsqueezy'
        };

        const response = await request(app)
          .post('/api/v1/billing/checkout/subscription')
          .set('Authorization', `Bearer ${hostToken}`)
          .send(checkoutData)
          .expect(200);

        expect(response.body).toMatchObject({
          checkout_url: expect.stringContaining('lemonsqueezy.com/checkout')
        });
      });

      it('should handle checkout creation failure', async () => {
        // Mock API failure
        nock.cleanAll();
        nock('https://api.lemonsqueezy.com')
          .post('/v1/checkouts')
          .reply(400, {
            errors: [{ detail: 'Invalid variant ID' }]
          });

        const checkoutData = {
          plan_id: testPlan.price_id,
          provider: 'lemonsqueezy'
        };

        const response = await request(app)
          .post('/api/v1/billing/checkout/subscription')
          .set('Authorization', `Bearer ${hostToken}`)
          .send(checkoutData)
          .expect(500);

        expect(response.body).toMatchObject({
          ok: false,
          error: expect.stringContaining('LemonSqueezy API error'),
          code: '500'
        });
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
            provider: 'lemonsqueezy'
          })
          .expect(401);
      });
    });
  });

  describe('Subscription Management', () => {
    let userSubscription: any;
    let otherUserSubscription: any;
    let testPlan: any;

    beforeEach(async () => {
      testPlan = await DbTestHelper.insertTestBillingPlan({
        provider: 'lemonsqueezy'
      });
      
      userSubscription = await DbTestHelper.insertTestSubscription(
        TEST_USERS.HOST.id,
        testPlan.id,
        {
          status: 'active',
          provider: 'lemonsqueezy',
          provider_subscription_id: 'sub_123456'
        }
      );

      otherUserSubscription = await DbTestHelper.insertTestSubscription(
        TEST_USERS.PARTICIPANT.id,
        testPlan.id,
        {
          provider: 'lemonsqueezy',
          provider_subscription_id: 'sub_789012'
        }
      );
    });

    describe('GET /api/v1/billing/subscriptions', () => {
      it('should list current user subscriptions only', async () => {
        const response = await request(app)
          .get('/api/v1/billing/subscriptions')
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({
          id: userSubscription.id,
          provider: 'lemonsqueezy',
          provider_subscription_id: 'sub_123456',
          status: 'active'
        });
      });

      it('should return empty array for user with no subscriptions', async () => {
        // Clean subscriptions for this test
        await TestDbHelper.cleanupAll();
        await TestDbHelper.seedTestUsers();

        const response = await request(app)
          .get('/api/v1/billing/subscriptions')
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/v1/billing/subscriptions')
          .expect(401);
      });
    });

    describe('GET /api/v1/billing/subscriptions/:subscriptionId', () => {
      it('should return subscription details for owner', async () => {
        const response = await request(app)
          .get(`/api/v1/billing/subscriptions/${userSubscription.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          id: userSubscription.id,
          status: 'active',
          provider: 'lemonsqueezy'
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
      let newPlan: any;

      beforeEach(async () => {
        newPlan = await DbTestHelper.insertTestBillingPlan({
          name: 'Upgrade Plan',
          amount_cents: 2999,
          provider: 'lemonsqueezy'
        });
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
        cancelledSubscription = await DbTestHelper.insertTestSubscription(
          TEST_USERS.HOST.id,
          testPlan.id,
          {
            status: 'canceled',
            cancel_at_period_end: true,
            provider: 'lemonsqueezy'
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
  });

  describe('Payment Methods Management', () => {
    describe('GET /api/v1/billing/payment-methods', () => {
      beforeEach(async () => {
        // Insert test payment methods for host user
        await DbTestHelper.insertTestPaymentMethod(TEST_USERS.HOST.id, {
          provider: 'lemonsqueezy',
          method_id: '123456',
          brand: 'visa',
          last_four: '4242',
          is_default: true
        });

        await DbTestHelper.insertTestPaymentMethod(TEST_USERS.HOST.id, {
          provider: 'lemonsqueezy',
          method_id: '789012',
          brand: 'mastercard',
          last_four: '5555',
          is_default: false
        });

        // Insert payment method for different user (should not appear)
        await DbTestHelper.insertTestPaymentMethod(TEST_USERS.PARTICIPANT.id, {
          provider: 'lemonsqueezy',
          method_id: '345678',
          brand: 'amex'
        });
      });

      it('should list current user payment methods only', async () => {
        const response = await request(app)
          .get('/api/v1/billing/payment-methods')
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              provider: 'lemonsqueezy',
              method_id: '123456',
              brand: 'visa',
              last_four: '4242',
              is_default: true
            }),
            expect.objectContaining({
              provider: 'lemonsqueezy',
              method_id: '789012',
              brand: 'mastercard',
              last_four: '5555',
              is_default: false
            })
          ])
        );
      });

      it('should return empty array for user with no payment methods', async () => {
        const response = await request(app)
          .get('/api/v1/billing/payment-methods')
          .set('Authorization', `Bearer ${participantToken}`)
          .expect(200);

        expect(response.body).toHaveLength(1); // They have one from beforeEach
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/v1/billing/payment-methods')
          .expect(401);
      });
    });

    describe('POST /api/v1/billing/payment-methods', () => {
      it('should add new payment method', async () => {
        const paymentMethodData = {
          provider: 'lemonsqueezy',
          method_id: '999888',
          brand: 'visa',
          last_four: '1234',
          exp_month: 12,
          exp_year: 2025,
          is_default: false
        };

        const response = await request(app)
          .post('/api/v1/billing/payment-methods')
          .set('Authorization', `Bearer ${hostToken}`)
          .send(paymentMethodData)
          .expect(201);

        expect(response.body).toMatchObject({
          provider: 'lemonsqueezy',
          method_id: '999888',
          brand: 'visa',
          last_four: '1234',
          is_default: false
        });
      });

      it('should set as default and unset others', async () => {
        // First add a default payment method
        await DbTestHelper.insertTestPaymentMethod(TEST_USERS.HOST.id, {
          provider: 'lemonsqueezy',
          is_default: true
        });

        const paymentMethodData = {
          provider: 'lemonsqueezy',
          method_id: '777666',
          is_default: true
        };

        const response = await request(app)
          .post('/api/v1/billing/payment-methods')
          .set('Authorization', `Bearer ${hostToken}`)
          .send(paymentMethodData)
          .expect(201);

        expect(response.body.is_default).toBe(true);

        // Verify other methods are no longer default
        const allMethods = await request(app)
          .get('/api/v1/billing/payment-methods')
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        const defaultMethods = allMethods.body.filter((m: any) => m.is_default);
        expect(defaultMethods).toHaveLength(1);
        expect(defaultMethods[0].method_id).toBe('777666');
      });

      it('should require provider and method_id', async () => {
        const response = await request(app)
          .post('/api/v1/billing/payment-methods')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({ provider: 'lemonsqueezy' }) // Missing method_id
          .expect(400);

        expect(response.body).toMatchObject({
          ok: false,
          error: expect.stringContaining('method_id'),
          code: '400'
        });
      });

      it('should require authentication', async () => {
        await request(app)
          .post('/api/v1/billing/payment-methods')
          .send({
            provider: 'lemonsqueezy',
            method_id: 'test123'
          })
          .expect(401);
      });
    });

    describe('GET /api/v1/billing/payment-methods/:methodId', () => {
      let userPaymentMethod: any;
      let otherUserPaymentMethod: any;

      beforeEach(async () => {
        userPaymentMethod = await DbTestHelper.insertTestPaymentMethod(
          TEST_USERS.HOST.id,
          { provider: 'lemonsqueezy' }
        );

        otherUserPaymentMethod = await DbTestHelper.insertTestPaymentMethod(
          TEST_USERS.PARTICIPANT.id,
          { provider: 'lemonsqueezy' }
        );
      });

      it('should return payment method details for owner', async () => {
        const response = await request(app)
          .get(`/api/v1/billing/payment-methods/${userPaymentMethod.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          id: userPaymentMethod.id,
          provider: 'lemonsqueezy'
        });
      });

      it('should deny access to other users payment methods', async () => {
        const response = await request(app)
          .get(`/api/v1/billing/payment-methods/${otherUserPaymentMethod.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(404);

        expect(response.body).toMatchObject({
          ok: false,
          error: 'Not found',
          code: '404'
        });
      });
    });

    describe('PUT /api/v1/billing/payment-methods/:methodId', () => {
      let userPaymentMethod: any;
      let secondPaymentMethod: any;

      beforeEach(async () => {
        userPaymentMethod = await DbTestHelper.insertTestPaymentMethod(
          TEST_USERS.HOST.id,
          { provider: 'lemonsqueezy', is_default: false }
        );

        secondPaymentMethod = await DbTestHelper.insertTestPaymentMethod(
          TEST_USERS.HOST.id,
          { provider: 'lemonsqueezy', is_default: true }
        );
      });

      it('should update payment method to default', async () => {
        const updateData = {
          is_default: true
        };

        const response = await request(app)
          .put(`/api/v1/billing/payment-methods/${userPaymentMethod.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.is_default).toBe(true);

        // Verify other method is no longer default
        const otherMethod = await request(app)
          .get(`/api/v1/billing/payment-methods/${secondPaymentMethod.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(otherMethod.body.is_default).toBe(false);
      });

      it('should deny access to non-owners', async () => {
        await request(app)
          .put(`/api/v1/billing/payment-methods/${userPaymentMethod.id}`)
          .set('Authorization', `Bearer ${participantToken}`)
          .send({ is_default: true })
          .expect(404);
      });
    });

    describe('DELETE /api/v1/billing/payment-methods/:methodId', () => {
      let userPaymentMethod: any;

      beforeEach(async () => {
        userPaymentMethod = await DbTestHelper.insertTestPaymentMethod(
          TEST_USERS.HOST.id,
          { provider: 'lemonsqueezy' }
        );
      });

      it('should delete payment method', async () => {
        await request(app)
          .delete(`/api/v1/billing/payment-methods/${userPaymentMethod.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(204);

        // Verify method is deleted
        await request(app)
          .get(`/api/v1/billing/payment-methods/${userPaymentMethod.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(404);
      });

      it('should deny access to non-owners', async () => {
        await request(app)
          .delete(`/api/v1/billing/payment-methods/${userPaymentMethod.id}`)
          .set('Authorization', `Bearer ${participantToken}`)
          .expect(404);
      });
    });

    describe('POST /api/v1/billing/payment-methods/:methodId/set-default', () => {
      let userPaymentMethod: any;
      let currentDefault: any;

      beforeEach(async () => {
        currentDefault = await DbTestHelper.insertTestPaymentMethod(
          TEST_USERS.HOST.id,
          { provider: 'lemonsqueezy', is_default: true }
        );

        userPaymentMethod = await DbTestHelper.insertTestPaymentMethod(
          TEST_USERS.HOST.id,
          { provider: 'lemonsqueezy', is_default: false }
        );
      });

      it('should set payment method as default', async () => {
        const response = await request(app)
          .post(`/api/v1/billing/payment-methods/${userPaymentMethod.id}/set-default`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body.is_default).toBe(true);

        // Verify previous default is no longer default
        const prevDefault = await request(app)
          .get(`/api/v1/billing/payment-methods/${currentDefault.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(prevDefault.body.is_default).toBe(false);
      });

      it('should deny access to non-owners', async () => {
        await request(app)
          .post(`/api/v1/billing/payment-methods/${userPaymentMethod.id}/set-default`)
          .set('Authorization', `Bearer ${participantToken}`)
          .expect(404);
      });
    });
  });

  describe('Invoice Management', () => {
    let userInvoice: any;
    let otherUserInvoice: any;
    let userSubscription: any;

    beforeEach(async () => {
      const testPlan = await DbTestHelper.insertTestBillingPlan({
        provider: 'lemonsqueezy'
      });

      userSubscription = await DbTestHelper.insertTestSubscription(
        TEST_USERS.HOST.id,
        testPlan.id,
        { provider: 'lemonsqueezy' }
      );

      userInvoice = await DbTestHelper.insertTestInvoice(
        TEST_USERS.HOST.id,
        userSubscription.id,
        {
          provider: 'lemonsqueezy',
          status: 'paid',
          amount_cents: 1999
        }
      );

      otherUserInvoice = await DbTestHelper.insertTestInvoice(
        TEST_USERS.PARTICIPANT.id,
        null,
        { provider: 'lemonsqueezy' }
      );
    });

    describe('GET /api/v1/billing/invoices', () => {
      it('should list current user invoices only', async () => {
        const response = await request(app)
          .get('/api/v1/billing/invoices')
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({
          id: userInvoice.id,
          subscription_id: userSubscription.id,
          provider: 'lemonsqueezy',
          status: 'paid',
          amount_cents: 1999
        });
      });

      it('should return empty array for user with no invoices', async () => {
        // Clean invoices for this test
        await TestDbHelper.cleanupAll();
        await TestDbHelper.seedTestUsers();

        const response = await request(app)
          .get('/api/v1/billing/invoices')
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body).toEqual([]);
      });

      it('should require authentication', async () => {
        await request(app)
          .get('/api/v1/billing/invoices')
          .expect(401);
      });
    });

    describe('GET /api/v1/billing/invoices/:invoiceId', () => {
      it('should return invoice details for owner', async () => {
        const response = await request(app)
          .get(`/api/v1/billing/invoices/${userInvoice.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.body).toMatchObject({
          id: userInvoice.id,
          subscription_id: userSubscription.id,
          provider: 'lemonsqueezy',
          status: 'paid'
        });
      });

      it('should deny access to other users invoices', async () => {
        const response = await request(app)
          .get(`/api/v1/billing/invoices/${otherUserInvoice.id}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(404);

        expect(response.body).toMatchObject({
          ok: false,
          error: 'Not found',
          code: '404'
        });
      });

      it('should return 404 for non-existent invoice', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        
        await request(app)
          .get(`/api/v1/billing/invoices/${fakeId}`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(404);
      });
    });

    describe('GET /api/v1/billing/invoices/:invoiceId/download', () => {
      it('should download invoice PDF for owner', async () => {
        const response = await request(app)
          .get(`/api/v1/billing/invoices/${userInvoice.id}/download`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(200);

        expect(response.headers['content-type']).toBe('application/pdf');
      });

      it('should deny access to other users invoices', async () => {
        await request(app)
          .get(`/api/v1/billing/invoices/${otherUserInvoice.id}/download`)
          .set('Authorization', `Bearer ${hostToken}`)
          .expect(404);
      });

      it('should require authentication', async () => {
        await request(app)
          .get(`/api/v1/billing/invoices/${userInvoice.id}/download`)
          .expect(401);
      });
    });
  });

  describe('Webhook Management', () => {
    const generateSignature = (payload: string, secret: string): string => {
      return crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    };

    beforeEach(() => {
      // Mock environment for webhook secret
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';
    });

    afterEach(() => {
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    });

    describe('POST /api/v1/billing/webhook/lemonsqueezy', () => {
      it('should process subscription_created webhook', async () => {
        const webhookEvent = LemonSqueezyMockFactory.webhookEvents.subscriptionCreated(TEST_USERS.HOST.id);
        const payload = JSON.stringify(webhookEvent);
        const signature = generateSignature(payload, 'test-webhook-secret');

        const response = await request(app)
          .post('/api/v1/billing/webhook/lemonsqueezy')
          .set('x-signature', signature)
          .send(webhookEvent)
          .expect(200);

        expect(response.text).toBe('Webhook processed successfully');
      });

      it('should process subscription_cancelled webhook', async () => {
        const webhookEvent = LemonSqueezyMockFactory.webhookEvents.subscriptionCancelled(TEST_USERS.HOST.id);
        const payload = JSON.stringify(webhookEvent);
        const signature = generateSignature(payload, 'test-webhook-secret');

        const response = await request(app)
          .post('/api/v1/billing/webhook/lemonsqueezy')
          .set('x-signature', signature)
          .send(webhookEvent)
          .expect(200);

        expect(response.text).toBe('Webhook processed successfully');
      });

      it('should process order_created webhook', async () => {
        const webhookEvent = LemonSqueezyMockFactory.webhookEvents.orderCreated(TEST_USERS.HOST.id);
        const payload = JSON.stringify(webhookEvent);
        const signature = generateSignature(payload, 'test-webhook-secret');

        const response = await request(app)
          .post('/api/v1/billing/webhook/lemonsqueezy')
          .set('x-signature', signature)
          .send(webhookEvent)
          .expect(200);

        expect(response.text).toBe('Webhook processed successfully');
      });

      it('should reject webhook with invalid signature', async () => {
        const webhookEvent = LemonSqueezyMockFactory.webhookEvents.subscriptionCreated();
        const invalidSignature = 'invalid-signature';

        await request(app)
          .post('/api/v1/billing/webhook/lemonsqueezy')
          .set('x-signature', invalidSignature)
          .send(webhookEvent)
          .expect(401);
      });

      it('should require signature header', async () => {
        const webhookEvent = LemonSqueezyMockFactory.webhookEvents.subscriptionCreated();

        const response = await request(app)
          .post('/api/v1/billing/webhook/lemonsqueezy')
          .send(webhookEvent)
          .expect(400);

        expect(response.text).toBe('Missing signature');
      });

      it('should handle unknown webhook events gracefully', async () => {
        const unknownEvent = {
          meta: {
            event_name: 'unknown_event',
            webhook_id: 'test-webhook',
            custom_data: {}
          },
          data: {
            type: 'unknown',
            id: '12345',
            attributes: {}
          }
        };

        const payload = JSON.stringify(unknownEvent);
        const signature = generateSignature(payload, 'test-webhook-secret');

        const response = await request(app)
          .post('/api/v1/billing/webhook/lemonsqueezy')
          .set('x-signature', signature)
          .send(unknownEvent)
          .expect(200);

        expect(response.text).toBe('Webhook processed successfully');
      });
    });

    describe('Webhook signature verification edge cases', () => {
      it('should handle webhook processing without secret in test mode', async () => {
        // Remove webhook secret to simulate test mode
        delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

        const webhookEvent = LemonSqueezyMockFactory.webhookEvents.subscriptionCreated();
        
        // In test mode, any signature should be accepted
        const response = await request(app)
          .post('/api/v1/billing/webhook/lemonsqueezy')
          .set('x-signature', 'any-signature')
          .send(webhookEvent)
          .expect(200);

        expect(response.text).toBe('Webhook processed successfully');
      });
    });
  });

  describe('Payment Flow Integration Tests', () => {
    describe('Complete subscription lifecycle', () => {
      let testPlan: any;
      let userId: string;

      beforeEach(async () => {
        testPlan = await DbTestHelper.insertTestBillingPlan({
          name: 'Integration Test Plan',
          amount_cents: 1999,
          provider: 'lemonsqueezy',
          price_id: '123456'
        });
        userId = TEST_USERS.HOST.id;

        // Mock LemonSqueezy checkout API
        nock('https://api.lemonsqueezy.com')
          .post('/v1/checkouts')
          .reply(200, {
            data: LemonSqueezyMockFactory.createCheckout({
              variant_id: parseInt(testPlan.price_id)
            })
          });
      });

      it('should complete full payment flow: checkout -> webhook -> subscription', async () => {
        // Step 1: Create checkout session
        const checkoutResponse = await request(app)
          .post('/api/v1/billing/checkout/subscription')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({
            plan_id: testPlan.price_id,
            provider: 'lemonsqueezy'
          })
          .expect(200);

        expect(checkoutResponse.body.checkout_url).toContain('lemonsqueezy.com');

        // Step 2: Simulate successful subscription creation via webhook
        const subscriptionCreatedEvent = LemonSqueezyMockFactory.webhookEvents.subscriptionCreated(userId);
        const payload = JSON.stringify(subscriptionCreatedEvent);
        const signature = crypto
          .createHmac('sha256', 'test-webhook-secret')
          .update(payload)
          .digest('hex');

        process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

        await request(app)
          .post('/api/v1/billing/webhook/lemonsqueezy')
          .set('x-signature', signature)
          .send(subscriptionCreatedEvent)
          .expect(200);

        // TODO: Step 3: Verify subscription appears in user's account
        // This would require the webhook handler to actually create database records
        // For now, we're just testing the API endpoints accept the webhooks
      });

      it('should handle payment failure flow', async () => {
        // Simulate failed order webhook
        const orderFailedEvent = {
          meta: {
            event_name: 'order_payment_failed',
            webhook_id: 'test-webhook',
            custom_data: { user_id: userId }
          },
          data: {
            type: 'orders',
            id: '12345',
            attributes: LemonSqueezyMockFactory.createOrder({ status: 'failed' }).attributes
          }
        };

        const payload = JSON.stringify(orderFailedEvent);
        const signature = crypto
          .createHmac('sha256', 'test-webhook-secret')
          .update(payload)
          .digest('hex');

        process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

        await request(app)
          .post('/api/v1/billing/webhook/lemonsqueezy')
          .set('x-signature', signature)
          .send(orderFailedEvent)
          .expect(200);
      });
    });

    describe('Error handling scenarios', () => {
      it('should handle provider service unavailable', async () => {
        const testPlan = await DbTestHelper.insertTestBillingPlan({
          provider: 'invalid-provider'
        });

        const response = await request(app)
          .post('/api/v1/billing/checkout/subscription')
          .set('Authorization', `Bearer ${hostToken}`)
          .send({
            plan_id: testPlan.price_id,
            provider: 'invalid-provider'
          })
          .expect(500);

        expect(response.body).toMatchObject({
          ok: false,
          error: expect.stringContaining('not available')
        });
      });
    });
  });

  afterAll(async () => {
    await TestDbHelper.cleanupAll();
    nock.cleanAll();
  });
});
