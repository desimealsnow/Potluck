import { Request, Response } from 'express';
import { BillingController } from '../../../src/controllers/billing.controller';
import { ProviderServiceFactory } from '../../../src/services/provider.factory';
import { supabase } from '../../../src/config/supabaseClient';
import { LemonSqueezyMockFactory, LemonSqueezyTestScenarios } from '../../fixtures/lemonSqueezyMocks';
import { 
  BillingPlanFactory, 
  SubscriptionFactory, 
  PaymentMethodFactory, 
  InvoiceFactory 
} from '../../fixtures/factories';

// Mock dependencies
jest.mock('../../../src/config/supabaseClient');
jest.mock('../../../src/services/provider.factory');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockProviderServiceFactory = ProviderServiceFactory as jest.Mocked<typeof ProviderServiceFactory>;

describe('BillingController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: {
        id: 'user-123',
        email: 'test@example.com'
      },
      params: {},
      body: {},
      headers: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      json: jest.fn(),
      setHeader: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe('listPlans', () => {
    it('should return active billing plans', async () => {
      const mockPlans = [
        BillingPlanFactory.buildLemonSqueezy({ name: 'Basic Plan' }),
        BillingPlanFactory.buildLemonSqueezy({ name: 'Premium Plan' })
      ];

      const mockSupabaseQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockResolvedValue({
        data: mockPlans,
        error: null
      });

      await BillingController.listPlans(mockReq as Request, mockRes as Response);

      expect(mockSupabase.from).toHaveBeenCalledWith('billing_plans');
      expect(mockSupabaseQuery.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockRes.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ name: 'Basic Plan' }),
        expect.objectContaining({ name: 'Premium Plan' })
      ]));
    });

    it('should handle database errors', async () => {
      const mockSupabaseQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      });

      await BillingController.listPlans(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Database error',
        code: '500',
        details: { message: 'Database error' }
      });
    });
  });

  describe('startCheckout', () => {
    beforeEach(() => {
      mockReq.body = {
        plan_id: '123456',
        provider: 'lemonsqueezy'
      };
    });

    it('should create checkout session successfully', async () => {
      const mockCheckoutResponse = {
        ok: true as const,
        data: { checkout_url: 'https://test.com/checkout' }
      };

      mockProviderServiceFactory.createCheckoutSession.mockResolvedValue(mockCheckoutResponse);

      await BillingController.startCheckout(mockReq as Request, mockRes as Response);

      expect(mockProviderServiceFactory.createCheckoutSession).toHaveBeenCalledWith('lemonsqueezy', {
        planId: '123456',
        userId: 'user-123',
        userEmail: 'test@example.com',
        userName: 'Test User'
      });
      expect(mockRes.json).toHaveBeenCalledWith({ checkout_url: 'https://test.com/checkout' });
    });

    it('should require plan_id and provider', async () => {
      mockReq.body = { plan_id: '123456' }; // Missing provider

      await BillingController.startCheckout(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'plan_id and provider are required',
        code: '400'
      });
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;

      await BillingController.startCheckout(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'User authentication required',
        code: '401'
      });
    });

    it('should handle provider service errors', async () => {
      const mockErrorResponse = {
        ok: false as const,
        error: 'LemonSqueezy API error'
      };

      mockProviderServiceFactory.createCheckoutSession.mockResolvedValue(mockErrorResponse);

      await BillingController.startCheckout(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'LemonSqueezy API error',
        code: '500'
      });
    });
  });

  describe('listMySubscriptions', () => {
    it('should return user subscriptions', async () => {
      const mockSubscriptions = [
        SubscriptionFactory.buildActive(),
        SubscriptionFactory.buildTrial()
      ];

      const mockSupabaseQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis()
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);
      mockSupabaseQuery.eq.mockResolvedValue({
        data: mockSubscriptions,
        error: null
      });

      await BillingController.listMySubscriptions(mockReq as Request, mockRes as Response);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_subscriptions');
      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(mockRes.json).toHaveBeenCalledWith(expect.any(Array));
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;

      await BillingController.listMySubscriptions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('getSubscription', () => {
    beforeEach(() => {
      mockReq.params = { subscriptionId: 'sub-123' };
    });

    it('should return subscription details for owner', async () => {
      const mockSubscription = SubscriptionFactory.buildActive();
      (mockSubscription as any).user_id = 'user-123'; // Ensure ownership

      const mockSupabaseQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockSubscription,
          error: null
        })
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);

      await BillingController.getSubscription(mockReq as Request, mockRes as Response);

      expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('id', 'sub-123');
      expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
        id: mockSubscription.id
      }));
    });

    it('should deny access to non-owner', async () => {
      const mockSubscription = SubscriptionFactory.buildActive();
      (mockSubscription as any).user_id = 'other-user'; // Different owner

      const mockSupabaseQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockSubscription,
          error: null
        })
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);

      await BillingController.getSubscription(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateSubscription', () => {
    beforeEach(() => {
      mockReq.params = { subscriptionId: 'sub-123' };
      mockReq.body = { cancel_at_period_end: true };
    });

    it('should update subscription successfully', async () => {
      const mockExistingSubscription = SubscriptionFactory.buildActive();
      (mockExistingSubscription as any).user_id = 'user-123';
      (mockExistingSubscription as any).id = 'sub-123';

      const mockUpdatedSubscription = { ...mockExistingSubscription, cancel_at_period_end: true };

      // Mock the select query for existing subscription
      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockExistingSubscription,
          error: null
        })
      };

      // Mock the update query
      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockUpdatedSubscription,
          error: null
        })
      };

      // First call returns select query, second call returns update query
      mockSupabase.from = jest.fn()
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockSelectQuery); // For getSubscription call

      await BillingController.updateSubscription(mockReq as Request, mockRes as Response);

      expect(mockUpdateQuery.update).toHaveBeenCalledWith({ cancel_at_period_end: true });
    });

    it('should deny access to non-owner', async () => {
      const mockExistingSubscription = SubscriptionFactory.buildActive();
      (mockExistingSubscription as any).user_id = 'other-user';

      const mockSupabaseQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockExistingSubscription,
          error: null
        })
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);

      await BillingController.updateSubscription(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('cancelSubscription', () => {
    beforeEach(() => {
      mockReq.params = { subscriptionId: 'sub-123' };
    });

    it('should cancel subscription successfully', async () => {
      const mockExistingSubscription = SubscriptionFactory.buildActive();
      (mockExistingSubscription as any).user_id = 'user-123';
      (mockExistingSubscription as any).id = 'sub-123';

      const mockCancelledSubscription = { 
        ...mockExistingSubscription, 
        status: 'canceled',
        cancel_at_period_end: true 
      };

      const mockSelectQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockExistingSubscription,
          error: null
        })
      };

      const mockUpdateQuery = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockCancelledSubscription,
          error: null
        })
      };

      mockSupabase.from = jest.fn()
        .mockReturnValueOnce(mockSelectQuery)
        .mockReturnValueOnce(mockUpdateQuery)
        .mockReturnValueOnce(mockSelectQuery); // For getSubscription call

      await BillingController.cancelSubscription(mockReq as Request, mockRes as Response);

      expect(mockUpdateQuery.update).toHaveBeenCalledWith({ 
        status: 'canceled', 
        cancel_at_period_end: true 
      });
    });
  });

  describe('Payment Methods', () => {
    describe('listPaymentMethods', () => {
      it('should return user payment methods', async () => {
        const mockPaymentMethods = [
          PaymentMethodFactory.buildDefault('user-123'),
          PaymentMethodFactory.buildDefault('user-123')
        ];

        const mockSupabaseQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({
            data: mockPaymentMethods,
            error: null
          })
        };

        mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);

        await BillingController.listPaymentMethods(mockReq as Request, mockRes as Response);

        expect(mockSupabase.from).toHaveBeenCalledWith('payment_methods');
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockRes.json).toHaveBeenCalledWith(expect.any(Array));
      });
    });

    describe('addPaymentMethod', () => {
      beforeEach(() => {
        mockReq.body = {
          provider: 'lemonsqueezy',
          method_id: 'pm_123456',
          brand: 'visa',
          last_four: '4242',
          is_default: false
        };
      });

      it('should add payment method successfully', async () => {
        const mockNewPaymentMethod = PaymentMethodFactory.buildDefault('user-123');

        const mockSupabaseQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockNewPaymentMethod,
            error: null
          })
        };

        mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);

        await BillingController.addPaymentMethod(mockReq as Request, mockRes as Response);

        expect(mockSupabaseQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
          user_id: 'user-123',
          provider: 'lemonsqueezy',
          method_id: 'pm_123456'
        }));
        expect(mockRes.status).toHaveBeenCalledWith(201);
      });

      it('should require provider and method_id', async () => {
        mockReq.body = { provider: 'lemonsqueezy' }; // Missing method_id

        await BillingController.addPaymentMethod(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({
          ok: false,
          error: 'provider and method_id are required',
          code: '400'
        });
      });
    });
  });

  describe('Invoice Management', () => {
    describe('listInvoices', () => {
      it('should return user invoices ordered by date', async () => {
        const mockInvoices = [
          InvoiceFactory.buildPaid('user-123'),
          InvoiceFactory.buildFailed('user-123')
        ];

        const mockSupabaseQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockInvoices,
            error: null
          })
        };

        mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);

        await BillingController.listInvoices(mockReq as Request, mockRes as Response);

        expect(mockSupabase.from).toHaveBeenCalledWith('invoices');
        expect(mockSupabaseQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
        expect(mockSupabaseQuery.order).toHaveBeenCalledWith('invoice_date', { ascending: false });
        expect(mockRes.json).toHaveBeenCalledWith(expect.any(Array));
      });
    });

    describe('downloadInvoice', () => {
      beforeEach(() => {
        mockReq.params = { invoiceId: 'inv-123' };
      });

      it('should download invoice PDF for owner', async () => {
        const mockInvoice = InvoiceFactory.buildPaid('user-123');

        const mockSupabaseQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockInvoice,
            error: null
          })
        };

        mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);

        await BillingController.downloadInvoice(mockReq as Request, mockRes as Response);

        expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalledWith(expect.any(Buffer));
      });

      it('should deny access to non-owner', async () => {
        const mockInvoice = InvoiceFactory.buildPaid('other-user');

        const mockSupabaseQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: mockInvoice,
            error: null
          })
        };

        mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);

        await BillingController.downloadInvoice(mockReq as Request, mockRes as Response);

        expect(mockRes.status).toHaveBeenCalledWith(404);
      });
    });
  });

  describe('handleProviderWebhook', () => {
    beforeEach(() => {
      mockReq.params = { provider: 'lemonsqueezy' };
      mockReq.headers = { 'x-signature': 'valid-signature' };
      mockReq.body = LemonSqueezyMockFactory.webhookEvents.subscriptionCreated();
    });

    it('should process webhook successfully', async () => {
      mockProviderServiceFactory.verifyWebhookSignature.mockReturnValue(true);
      mockProviderServiceFactory.handleWebhook.mockResolvedValue({
        ok: true,
        data: { processed: true }
      });

      await BillingController.handleProviderWebhook(mockReq as Request, mockRes as Response);

      expect(mockProviderServiceFactory.verifyWebhookSignature).toHaveBeenCalledWith(
        'lemonsqueezy',
        JSON.stringify(mockReq.body),
        'valid-signature'
      );
      expect(mockProviderServiceFactory.handleWebhook).toHaveBeenCalledWith(
        'lemonsqueezy',
        mockReq.body
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.send).toHaveBeenCalledWith('Webhook processed successfully');
    });

    it('should reject webhook with invalid signature', async () => {
      mockProviderServiceFactory.verifyWebhookSignature.mockReturnValue(false);

      await BillingController.handleProviderWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.send).toHaveBeenCalledWith('Invalid signature');
    });

    it('should require signature header', async () => {
      mockReq.headers = {}; // No signature header

      await BillingController.handleProviderWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.send).toHaveBeenCalledWith('Missing signature');
    });

    it('should handle webhook processing errors', async () => {
      mockProviderServiceFactory.verifyWebhookSignature.mockReturnValue(true);
      mockProviderServiceFactory.handleWebhook.mockResolvedValue({
        ok: false,
        error: 'Processing failed'
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await BillingController.handleProviderWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Webhook processing failed');
      expect(consoleSpy).toHaveBeenCalledWith('Webhook processing failed:', 'Processing failed');

      consoleSpy.mockRestore();
    });

    it('should handle unexpected errors', async () => {
      mockProviderServiceFactory.verifyWebhookSignature.mockReturnValue(true);
      mockProviderServiceFactory.handleWebhook.mockRejectedValue(new Error('Unexpected error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await BillingController.handleProviderWebhook(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith('Internal server error');
      expect(consoleSpy).toHaveBeenCalledWith('Webhook error:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user in authenticated requests', async () => {
      mockReq.user = undefined;

      await BillingController.listMySubscriptions(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Unauthorized',
        code: '401'
      });
    });

    it('should handle database connection errors', async () => {
      const mockSupabaseQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };

      mockSupabase.from = jest.fn().mockReturnValue(mockSupabaseQuery);

      await BillingController.listPlans(mockReq as Request, mockRes as Response);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });
  });
});
