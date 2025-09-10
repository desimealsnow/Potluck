import { ServiceResult } from '../utils/helper';
import { getProviderConfig, validateProviderConfig } from '../config/providers';
import { paymentProviderService } from './payment-providers.service';

export interface CheckoutData {
  planId: string;
  userId: string;
  userEmail: string;
  userName?: string;
}

export interface ProviderService {
  createCheckoutSession(data: CheckoutData): Promise<ServiceResult<{ checkout_url: string }>>;
  getSubscription(subscriptionId: string): Promise<ServiceResult<any>>;
  cancelSubscription(subscriptionId: string): Promise<ServiceResult<{ success: boolean }>>;
  verifyWebhookSignature(payload: string, signature: string): boolean;
  handleWebhook(event: any): Promise<ServiceResult<{ processed: boolean }>>;
}

/**
 * Generic Provider Service Factory
 * Routes requests to the appropriate provider service based on provider name
 */
export class ProviderServiceFactory {
  private static services: Map<string, ProviderService> = new Map();

  static {
    // Register available services
    this.services.set('lemonsqueezy', paymentProviderService);
    // Add other provider services here as they're implemented
  }

  /**
   * Get service for a specific provider
   */
  static getService(providerName: string): ProviderService | null {
    // Validate provider configuration first
    const validation = validateProviderConfig(providerName);
    if (!validation.valid) {
      console.error(`Provider ${providerName} validation failed:`, validation.errors);
      return null;
    }

    const service = this.services.get(providerName);
    if (!service) {
      console.error(`No service implementation found for provider: ${providerName}`);
      return null;
    }

    return service;
  }

  /**
   * Create checkout session for any supported provider
   */
  static async createCheckoutSession(
    providerName: string, 
    data: CheckoutData
  ): Promise<ServiceResult<{ checkout_url: string }>> {
    const service = this.getService(providerName);
    if (!service) {
      return {
        ok: false,
        error: `Provider ${providerName} is not available or not properly configured`,
        code: '400',
      };
    }

    return service.createCheckoutSession(data);
  }

  /**
   * Get subscription for any supported provider
   */
  static async getSubscription(
    providerName: string, 
    subscriptionId: string
  ): Promise<ServiceResult<any>> {
    const service = this.getService(providerName);
    if (!service) {
      return {
        ok: false,
        error: `Provider ${providerName} is not available or not properly configured`,
        code: '400',
      };
    }

    return service.getSubscription(subscriptionId);
  }

  /**
   * Cancel subscription for any supported provider
   */
  static async cancelSubscription(
    providerName: string, 
    subscriptionId: string
  ): Promise<ServiceResult<{ success: boolean }>> {
    const service = this.getService(providerName);
    if (!service) {
      return {
        ok: false,
        error: `Provider ${providerName} is not available or not properly configured`,
        code: '400',
      };
    }

    return service.cancelSubscription(subscriptionId);
  }

  /**
   * Verify webhook signature for any supported provider
   */
  static verifyWebhookSignature(
    providerName: string, 
    payload: string, 
    signature: string
  ): boolean {
    const service = this.getService(providerName);
    if (!service) {
      console.error(`No service available for provider: ${providerName}`);
      return false;
    }

    return service.verifyWebhookSignature(payload, signature);
  }

  /**
   * Handle webhook for any supported provider
   */
  static async handleWebhook(
    providerName: string, 
    event: any
  ): Promise<ServiceResult<{ processed: boolean }>> {
    const service = this.getService(providerName);
    if (!service) {
      return {
        ok: false,
        error: `Provider ${providerName} is not available or not properly configured`,
        code: '400',
      };
    }

    return service.handleWebhook(event);
  }

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Check if provider is available
   */
  static isProviderAvailable(providerName: string): boolean {
    const validation = validateProviderConfig(providerName);
    return validation.valid && this.services.has(providerName);
  }
}
