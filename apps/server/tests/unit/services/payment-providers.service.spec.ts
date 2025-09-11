import { PaymentProviderService } from '../../../src/services/payment-providers.service';
import { LemonSqueezyMockFactory, LemonSqueezyMockData } from '../../fixtures/lemonSqueezyMocks';
import nock from 'nock';
import { describe, it, expect, beforeAll, beforeEach, afterEach, jest } from '@jest/globals';

// Mock environment variables
const mockEnv = {
  LEMONSQUEEZY_API_KEY: 'test-api-key',
  LEMONSQUEEZY_STORE_ID: '12345',
  LEMONSQUEEZY_WEBHOOK_SECRET: 'test-webhook-secret',
  FRONTEND_URL: 'http://localhost:3000'
};

describe('PaymentProviderService', () => {
  let service: PaymentProviderService;

  beforeAll(() => {
    // Set environment variables
    Object.keys(mockEnv).forEach(key => {
      process.env[key] = mockEnv[key as keyof typeof mockEnv];
    });
  });

  beforeEach(() => {
    service = new PaymentProviderService();
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  afterAll(() => {
    // Clean up environment variables
    Object.keys(mockEnv).forEach(key => {
      delete process.env[key];
    });
  });

  describe('Constructor', () => {
    it('should initialize with environment variables', () => {
      expect(() => new PaymentProviderService()).not.toThrow();
    });

    it('should throw error if API key is missing', () => {
      delete process.env.LEMONSQUEEZY_API_KEY;
      
      expect(() => new PaymentProviderService()).toThrow(
        'LemonSqueezy API key missing. Please set LEMONSQUEEZY_API_KEY environment variable.'
      );

      // Restore for other tests
      process.env.LEMONSQUEEZY_API_KEY = mockEnv.LEMONSQUEEZY_API_KEY;
    });

    it('should warn but not throw if store ID is missing', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      delete process.env.LEMONSQUEEZY_STORE_ID;
      
      expect(() => new PaymentProviderService()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LEMONSQUEEZY_STORE_ID not set')
      );

      consoleSpy.mockRestore();
      process.env.LEMONSQUEEZY_STORE_ID = mockEnv.LEMONSQUEEZY_STORE_ID;
    });

    it('should warn but not throw if webhook secret is missing', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
      
      expect(() => new PaymentProviderService()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('LEMONSQUEEZY_WEBHOOK_SECRET not set')
      );

      consoleSpy.mockRestore();
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = mockEnv.LEMONSQUEEZY_WEBHOOK_SECRET;
    });
  });

  describe('createCheckoutSession', () => {
    const checkoutData = {
      planId: '123456',
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User'
    };

    it('should create checkout session successfully', async () => {
      const mockCheckout = LemonSqueezyMockFactory.createCheckout({
        variant_id: parseInt(checkoutData.planId)
      });

      nock('https://api.lemonsqueezy.com')
        .post('/v1/checkouts')
        .reply(200, { data: mockCheckout });

      const result = await service.createCheckoutSession(checkoutData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.checkout_url).toBe(mockCheckout.attributes.url);
      }
    });

    it('should return test mode URL when no store ID is configured', async () => {
      // Create service without store ID
      delete process.env.LEMONSQUEEZY_STORE_ID;
      const testService = new PaymentProviderService();
      process.env.LEMONSQUEEZY_STORE_ID = mockEnv.LEMONSQUEEZY_STORE_ID; // Restore

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = await testService.createCheckoutSession(checkoutData);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.checkout_url).toContain('test-checkout.lemonsqueezy.com');
        expect(result.data.checkout_url).toContain(`plan=${checkoutData.planId}`);
        expect(result.data.checkout_url).toContain(`user=${checkoutData.userId}`);
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Test mode: Returning mock checkout URL'
      );

      consoleSpy.mockRestore();
    });

    it('should handle API errors gracefully', async () => {
      nock('https://api.lemonsqueezy.com')
        .post('/v1/checkouts')
        .reply(400, {
          errors: [{ detail: 'Invalid variant ID' }]
        });

      const result = await service.createCheckoutSession(checkoutData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('LemonSqueezy API error: Invalid variant ID');
        expect(result.code).toBe('500');
      }
    });

    it('should handle network errors', async () => {
      nock('https://api.lemonsqueezy.com')
        .post('/v1/checkouts')
        .replyWithError('Network error');

      const result = await service.createCheckoutSession(checkoutData);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Failed to create checkout session');
        expect(result.code).toBe('500');
      }
    });

    it('should send correct request payload', async () => {
      let capturedRequestBody: any;

      nock('https://api.lemonsqueezy.com')
        .post('/v1/checkouts')
        .reply(function(uri, requestBody) {
          capturedRequestBody = requestBody;
          return [200, { data: LemonSqueezyMockFactory.createCheckout() }];
        });

      await service.createCheckoutSession(checkoutData);

      expect(capturedRequestBody).toMatchObject({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email: checkoutData.userEmail,
              name: checkoutData.userName,
              custom: {
                user_id: checkoutData.userId,
                plan_id: checkoutData.planId,
              }
            },
            product_options: {
              enabled_variants: [checkoutData.planId],
              redirect_url: 'http://localhost:3000/success',
              receipt_button_text: 'Return to Potluck',
              receipt_thank_you_note: 'Thank you for subscribing to Potluck!'
            }
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: mockEnv.LEMONSQUEEZY_STORE_ID
              }
            },
            variant: {
              data: {
                type: 'variants',
                id: checkoutData.planId
              }
            }
          }
        }
      });
    });
  });

  describe('getSubscription', () => {
    const subscriptionId = '1234567';

    it('should get subscription details successfully', async () => {
      const mockSubscription = LemonSqueezyMockFactory.createSubscription();

      nock('https://api.lemonsqueezy.com')
        .get(`/v1/subscriptions/${subscriptionId}`)
        .reply(200, { data: mockSubscription });

      const result = await service.getSubscription(subscriptionId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.subscriptionId).toBe(mockSubscription.id);
        expect(result.data.status).toBe(mockSubscription.attributes.status);
      }
    });

    it('should handle subscription not found', async () => {
      nock('https://api.lemonsqueezy.com')
        .get(`/v1/subscriptions/${subscriptionId}`)
        .reply(404, {
          errors: [{ detail: 'Subscription not found' }]
        });

      const result = await service.getSubscription(subscriptionId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('LemonSqueezy API error: Subscription not found');
        expect(result.code).toBe('500');
      }
    });

    it('should handle network errors', async () => {
      nock('https://api.lemonsqueezy.com')
        .get(`/v1/subscriptions/${subscriptionId}`)
        .replyWithError('Connection timeout');

      const result = await service.getSubscription(subscriptionId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Failed to get subscription');
        expect(result.code).toBe('500');
      }
    });
  });

  describe('cancelSubscription', () => {
    const subscriptionId = '1234567';

    it('should cancel subscription successfully', async () => {
      nock('https://api.lemonsqueezy.com')
        .patch(`/v1/subscriptions/${subscriptionId}`)
        .reply(200, { data: { id: subscriptionId } });

      const result = await service.cancelSubscription(subscriptionId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.success).toBe(true);
      }
    });

    it('should handle cancellation errors', async () => {
      nock('https://api.lemonsqueezy.com')
        .patch(`/v1/subscriptions/${subscriptionId}`)
        .reply(400, {
          errors: [{ detail: 'Subscription already cancelled' }]
        });

      const result = await service.cancelSubscription(subscriptionId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('LemonSqueezy API error: Subscription already cancelled');
        expect(result.code).toBe('500');
      }
    });

    it('should send correct cancellation payload', async () => {
      let capturedRequestBody: any;

      nock('https://api.lemonsqueezy.com')
        .patch(`/v1/subscriptions/${subscriptionId}`)
        .reply(function(uri, requestBody) {
          capturedRequestBody = requestBody;
          return [200, { data: { id: subscriptionId } }];
        });

      await service.cancelSubscription(subscriptionId);

      expect(capturedRequestBody).toMatchObject({
        data: {
          type: 'subscriptions',
          id: subscriptionId,
          attributes: {
            cancelled: true
          }
        }
      });
    });
  });

  describe('verifyWebhookSignature', () => {
    const payload = JSON.stringify({ test: 'data' });
    const secret = 'test-secret';

    it('should verify valid signature', () => {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      // Temporarily set webhook secret
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = secret;
      const testService = new PaymentProviderService();
      
      const isValid = testService.verifyWebhookSignature(payload, expectedSignature);
      
      expect(isValid).toBe(true);

      // Restore original secret
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = mockEnv.LEMONSQUEEZY_WEBHOOK_SECRET;
    });

    it('should reject invalid signature', () => {
      const invalidSignature = 'invalid-signature';

      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = secret;
      const testService = new PaymentProviderService();
      
      const isValid = testService.verifyWebhookSignature(payload, invalidSignature);
      
      expect(isValid).toBe(false);

      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = mockEnv.LEMONSQUEEZY_WEBHOOK_SECRET;
    });

    it('should skip verification in test mode without webhook secret', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      delete process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
      const testService = new PaymentProviderService();
      
      const isValid = testService.verifyWebhookSignature(payload, 'any-signature');
      
      expect(isValid).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Test mode: Skipping webhook signature verification'
      );

      consoleSpy.mockRestore();
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET = mockEnv.LEMONSQUEEZY_WEBHOOK_SECRET;
    });
  });

  describe('handleWebhook', () => {
    it('should handle subscription_created event', async () => {
      const event = {
        meta: { event_name: 'subscription_created' },
        data: LemonSqueezyMockFactory.createSubscription()
      };

      const result = await service.handleWebhook(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.processed).toBe(true);
      }
    });

    it('should handle subscription_updated event', async () => {
      const event = {
        meta: { event_name: 'subscription_updated' },
        data: LemonSqueezyMockFactory.createSubscription()
      };

      const result = await service.handleWebhook(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.processed).toBe(true);
      }
    });

    it('should handle subscription_cancelled event', async () => {
      const event = {
        meta: { event_name: 'subscription_cancelled' },
        data: LemonSqueezyMockFactory.createSubscription({ cancelled: true })
      };

      const result = await service.handleWebhook(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.processed).toBe(true);
      }
    });

    it('should handle order_created event', async () => {
      const event = {
        meta: { event_name: 'order_created' },
        data: LemonSqueezyMockFactory.createOrder()
      };

      const result = await service.handleWebhook(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.processed).toBe(true);
      }
    });

    it('should handle order_refunded event', async () => {
      const event = {
        meta: { event_name: 'order_refunded' },
        data: LemonSqueezyMockFactory.createOrder({ status: 'refunded', refunded: true })
      };

      const result = await service.handleWebhook(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.processed).toBe(true);
      }
    });

    it('should handle unknown event types gracefully', async () => {
      const event = {
        meta: { event_name: 'unknown_event' },
        data: { unknown: 'data' }
      };

      const result = await service.handleWebhook(event);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.processed).toBe(false);
      }
    });

    it('should handle webhook processing errors', async () => {
      // Pass malformed event to trigger error
      const malformedEvent = null;

      const result = await service.handleWebhook(malformedEvent);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Failed to process webhook');
        expect(result.code).toBe('500');
      }
    });
  });

  describe('API Request Headers', () => {
    it('should include correct headers in API requests', async () => {
      let capturedHeaders: any;

      nock('https://api.lemonsqueezy.com')
        .post('/v1/checkouts')
        .reply(function() {
          capturedHeaders = this.req.headers;
          return [200, { data: LemonSqueezyMockFactory.createCheckout() }];
        });

      await service.createCheckoutSession({
        planId: '123',
        userId: 'user-123',
        userEmail: 'test@example.com'
      });

      expect(capturedHeaders.authorization).toBe(`Bearer ${mockEnv.LEMONSQUEEZY_API_KEY}`);
      expect(capturedHeaders.accept).toBe('application/vnd.api+json');
      expect(capturedHeaders['content-type']).toBe('application/json');
    });
  });

  describe('Error Response Formats', () => {
    it('should handle LemonSqueezy error response format', async () => {
      nock('https://api.lemonsqueezy.com')
        .post('/v1/checkouts')
        .reply(422, {
          errors: [
            { detail: 'Variant is not available for checkout' },
            { detail: 'Store is not active' }
          ]
        });

      const result = await service.createCheckoutSession({
        planId: '123',
        userId: 'user-123',
        userEmail: 'test@example.com'
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Variant is not available for checkout');
      }
    });

    it('should handle HTTP error without detailed message', async () => {
      nock('https://api.lemonsqueezy.com')
        .post('/v1/checkouts')
        .reply(500, 'Internal Server Error');

      const result = await service.createCheckoutSession({
        planId: '123',
        userId: 'user-123',
        userEmail: 'test@example.com'
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('Internal Server Error');
      }
    });
  });
});
