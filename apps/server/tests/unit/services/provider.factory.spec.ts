import { ProviderServiceFactory, CheckoutData } from '../../../src/services/provider.factory';
import { PaymentProviderService } from '../../../src/services/payment-providers.service';
import { LemonSqueezyMockFactory } from '../../fixtures/lemonSqueezyMocks';

// Mock the payment provider service
jest.mock('../../../src/services/payment-providers.service');

// Mock the providers config
jest.mock('../../../src/config/providers', () => ({
  validateProviderConfig: jest.fn(),
  getProviderConfig: jest.fn()
}));

const { validateProviderConfig } = require('../../../src/config/providers');

describe('ProviderServiceFactory', () => {
  const mockPaymentService = {
    createCheckoutSession: jest.fn(),
    getSubscription: jest.fn(),
    cancelSubscription: jest.fn(),
    verifyWebhookSignature: jest.fn(),
    handleWebhook: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful validation by default
    validateProviderConfig.mockReturnValue({ valid: true, errors: [] });
    
    // Replace the service in the factory's services map
    (ProviderServiceFactory as any).services.set('lemonsqueezy', mockPaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getService', () => {
    it('should return service for valid provider', () => {
      const service = ProviderServiceFactory.getService('lemonsqueezy');
      
      expect(service).toBe(mockPaymentService);
      expect(validateProviderConfig).toHaveBeenCalledWith('lemonsqueezy');
    });

    it('should return null for invalid provider configuration', () => {
      validateProviderConfig.mockReturnValue({
        valid: false,
        errors: ['API key missing']
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const service = ProviderServiceFactory.getService('lemonsqueezy');
      
      expect(service).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Provider lemonsqueezy validation failed:',
        ['API key missing']
      );

      consoleSpy.mockRestore();
    });

    it('should return null for unsupported provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const service = ProviderServiceFactory.getService('unsupported-provider');
      
      expect(service).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'No service implementation found for provider: unsupported-provider'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('createCheckoutSession', () => {
    const checkoutData: CheckoutData = {
      planId: '123456',
      userId: 'user-123',
      userEmail: 'test@example.com',
      userName: 'Test User'
    };

    it('should create checkout session for valid provider', async () => {
      const mockResponse = { ok: true, data: { checkout_url: 'https://test.com/checkout' } };
      mockPaymentService.createCheckoutSession.mockResolvedValue(mockResponse);

      const result = await ProviderServiceFactory.createCheckoutSession('lemonsqueezy', checkoutData);

      expect(result).toEqual(mockResponse);
      expect(mockPaymentService.createCheckoutSession).toHaveBeenCalledWith(checkoutData);
    });

    it('should return error for invalid provider', async () => {
      const result = await ProviderServiceFactory.createCheckoutSession('invalid-provider', checkoutData);

      expect(result).toEqual({
        ok: false,
        error: 'Provider invalid-provider is not available or not properly configured',
        code: '400'
      });
      expect(mockPaymentService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const mockError = { ok: false, error: 'API Error', code: '500' };
      mockPaymentService.createCheckoutSession.mockResolvedValue(mockError);

      const result = await ProviderServiceFactory.createCheckoutSession('lemonsqueezy', checkoutData);

      expect(result).toEqual(mockError);
    });
  });

  describe('getSubscription', () => {
    const subscriptionId = '1234567';

    it('should get subscription for valid provider', async () => {
      const mockSubscription = LemonSqueezyMockFactory.createSubscription();
      const mockResponse = { ok: true, data: mockSubscription };
      mockPaymentService.getSubscription.mockResolvedValue(mockResponse);

      const result = await ProviderServiceFactory.getSubscription('lemonsqueezy', subscriptionId);

      expect(result).toEqual(mockResponse);
      expect(mockPaymentService.getSubscription).toHaveBeenCalledWith(subscriptionId);
    });

    it('should return error for invalid provider', async () => {
      const result = await ProviderServiceFactory.getSubscription('invalid-provider', subscriptionId);

      expect(result).toEqual({
        ok: false,
        error: 'Provider invalid-provider is not available or not properly configured',
        code: '400'
      });
      expect(mockPaymentService.getSubscription).not.toHaveBeenCalled();
    });
  });

  describe('cancelSubscription', () => {
    const subscriptionId = '1234567';

    it('should cancel subscription for valid provider', async () => {
      const mockResponse = { ok: true, data: { success: true } };
      mockPaymentService.cancelSubscription.mockResolvedValue(mockResponse);

      const result = await ProviderServiceFactory.cancelSubscription('lemonsqueezy', subscriptionId);

      expect(result).toEqual(mockResponse);
      expect(mockPaymentService.cancelSubscription).toHaveBeenCalledWith(subscriptionId);
    });

    it('should return error for invalid provider', async () => {
      const result = await ProviderServiceFactory.cancelSubscription('invalid-provider', subscriptionId);

      expect(result).toEqual({
        ok: false,
        error: 'Provider invalid-provider is not available or not properly configured',
        code: '400'
      });
      expect(mockPaymentService.cancelSubscription).not.toHaveBeenCalled();
    });
  });

  describe('verifyWebhookSignature', () => {
    const payload = 'test-payload';
    const signature = 'test-signature';

    it('should verify signature for valid provider', () => {
      mockPaymentService.verifyWebhookSignature.mockReturnValue(true);

      const result = ProviderServiceFactory.verifyWebhookSignature('lemonsqueezy', payload, signature);

      expect(result).toBe(true);
      expect(mockPaymentService.verifyWebhookSignature).toHaveBeenCalledWith(payload, signature);
    });

    it('should return false for invalid provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = ProviderServiceFactory.verifyWebhookSignature('invalid-provider', payload, signature);

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'No service available for provider: invalid-provider'
      );
      expect(mockPaymentService.verifyWebhookSignature).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should return false for invalid signature', () => {
      mockPaymentService.verifyWebhookSignature.mockReturnValue(false);

      const result = ProviderServiceFactory.verifyWebhookSignature('lemonsqueezy', payload, signature);

      expect(result).toBe(false);
    });
  });

  describe('handleWebhook', () => {
    const webhookEvent = LemonSqueezyMockFactory.webhookEvents.subscriptionCreated();

    it('should handle webhook for valid provider', async () => {
      const mockResponse = { ok: true, data: { processed: true } };
      mockPaymentService.handleWebhook.mockResolvedValue(mockResponse);

      const result = await ProviderServiceFactory.handleWebhook('lemonsqueezy', webhookEvent);

      expect(result).toEqual(mockResponse);
      expect(mockPaymentService.handleWebhook).toHaveBeenCalledWith(webhookEvent);
    });

    it('should return error for invalid provider', async () => {
      const result = await ProviderServiceFactory.handleWebhook('invalid-provider', webhookEvent);

      expect(result).toEqual({
        ok: false,
        error: 'Provider invalid-provider is not available or not properly configured',
        code: '400'
      });
      expect(mockPaymentService.handleWebhook).not.toHaveBeenCalled();
    });

    it('should handle service errors gracefully', async () => {
      const mockError = { ok: false, error: 'Webhook processing failed', code: '500' };
      mockPaymentService.handleWebhook.mockResolvedValue(mockError);

      const result = await ProviderServiceFactory.handleWebhook('lemonsqueezy', webhookEvent);

      expect(result).toEqual(mockError);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = ProviderServiceFactory.getAvailableProviders();
      
      expect(providers).toContain('lemonsqueezy');
      expect(Array.isArray(providers)).toBe(true);
    });
  });

  describe('isProviderAvailable', () => {
    it('should return true for available and valid provider', () => {
      validateProviderConfig.mockReturnValue({ valid: true, errors: [] });
      
      const result = ProviderServiceFactory.isProviderAvailable('lemonsqueezy');
      
      expect(result).toBe(true);
      expect(validateProviderConfig).toHaveBeenCalledWith('lemonsqueezy');
    });

    it('should return false for invalid provider configuration', () => {
      validateProviderConfig.mockReturnValue({ valid: false, errors: ['Invalid config'] });
      
      const result = ProviderServiceFactory.isProviderAvailable('lemonsqueezy');
      
      expect(result).toBe(false);
    });

    it('should return false for unsupported provider', () => {
      const result = ProviderServiceFactory.isProviderAvailable('unsupported-provider');
      
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle service initialization errors', () => {
      // Mock service that throws during construction
      const badService = {
        createCheckoutSession: () => { throw new Error('Service unavailable'); }
      };
      
      (ProviderServiceFactory as any).services.set('bad-provider', badService);
      
      expect(async () => {
        await ProviderServiceFactory.createCheckoutSession('bad-provider', {
          planId: '123',
          userId: 'user-123',
          userEmail: 'test@example.com'
        });
      }).not.toThrow();
    });

    it('should handle missing service methods gracefully', () => {
      // Mock service with missing methods
      const incompleteService = {
        createCheckoutSession: jest.fn()
        // Missing other required methods
      };
      
      (ProviderServiceFactory as any).services.set('incomplete-provider', incompleteService);
      
      expect(() => {
        ProviderServiceFactory.verifyWebhookSignature('incomplete-provider', 'payload', 'signature');
      }).not.toThrow();
    });
  });

  describe('Provider Configuration Integration', () => {
    it('should check configuration before returning service', () => {
      validateProviderConfig.mockReturnValue({ valid: false, errors: ['Missing API key'] });
      
      const service = ProviderServiceFactory.getService('lemonsqueezy');
      
      expect(service).toBeNull();
      expect(validateProviderConfig).toHaveBeenCalledWith('lemonsqueezy');
    });

    it('should cache validation results appropriately', () => {
      // First call
      ProviderServiceFactory.getService('lemonsqueezy');
      // Second call
      ProviderServiceFactory.getService('lemonsqueezy');
      
      // Should validate each time (no caching expected for validation)
      expect(validateProviderConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('Service Registration', () => {
    it('should allow new services to be registered', () => {
      const newService = {
        createCheckoutSession: jest.fn(),
        getSubscription: jest.fn(),
        cancelSubscription: jest.fn(),
        verifyWebhookSignature: jest.fn(),
        handleWebhook: jest.fn()
      };

      // Manually register new service
      (ProviderServiceFactory as any).services.set('new-provider', newService);
      
      validateProviderConfig.mockReturnValue({ valid: true, errors: [] });
      
      const service = ProviderServiceFactory.getService('new-provider');
      expect(service).toBe(newService);
    });
  });
});