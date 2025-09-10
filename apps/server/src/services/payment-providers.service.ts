import { ServiceResult } from '../utils/helper';

interface PaymentProviderConfig {
  apiKey: string;
  storeId: string;
  webhookSecret: string;
}

interface CheckoutData {
  planId: string;
  userId: string;
  userEmail: string;
  userName?: string;
}

interface SubscriptionData {
  subscriptionId: string;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialStart?: string;
  trialEnd?: string;
  cancelAtPeriodEnd?: boolean;
}

export class PaymentProviderService {
  private config: PaymentProviderConfig;
  private baseUrl = 'https://api.lemonsqueezy.com/v1';

  constructor() {
    this.config = {
      apiKey: process.env.LEMONSQUEEZY_API_KEY || '',
      storeId: process.env.LEMONSQUEEZY_STORE_ID || '',
      webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '',
    };

    if (!this.config.apiKey) {
      throw new Error('LemonSqueezy API key missing. Please set LEMONSQUEEZY_API_KEY environment variable.');
    }

    // Store ID is optional for test mode
    if (!this.config.storeId) {
      console.warn('LEMONSQUEEZY_STORE_ID not set. Using test mode - you may need to set this for production.');
    }

    // Webhook secret is optional for test mode
    if (!this.config.webhookSecret) {
      console.warn('LEMONSQUEEZY_WEBHOOK_SECRET not set. Webhook verification will be disabled for test mode.');
    }
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(data: CheckoutData): Promise<ServiceResult<{ checkout_url: string }>> {
    try {
      // For test mode without store ID, return a mock checkout URL
      if (!this.config.storeId) {
        console.warn('Test mode: Returning mock checkout URL');
        return {
          ok: true,
          data: { 
            checkout_url: `https://test-checkout.lemonsqueezy.com/checkout?plan=${data.planId}&user=${data.userId}` 
          },
        };
      }

      const response = await fetch(`${this.baseUrl}/checkouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_data: {
                email: data.userEmail,
                name: data.userName || data.userEmail,
                custom: {
                  user_id: data.userId,
                  plan_id: data.planId,
                },
              },
              product_options: {
                enabled_variants: [data.planId], // This should be your LemonSqueezy variant ID
                redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/billing/success`,
                receipt_button_text: 'Return to Potluck',
                receipt_thank_you_note: 'Thank you for subscribing to Potluck!',
              },
            },
            relationships: {
              store: {
                data: {
                  type: 'stores',
                  id: this.config.storeId,
                },
              },
              variant: {
                data: {
                  type: 'variants',
                  id: data.planId, // This should be your LemonSqueezy variant ID
                },
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          ok: false,
          error: `LemonSqueezy API error: ${errorData.errors?.[0]?.detail || response.statusText}`,
          code: '500',
        };
      }

      const result = await response.json();
      const checkoutUrl = result.data.attributes.url;

      return {
        ok: true,
        data: { checkout_url: checkoutUrl },
      };
    } catch (error) {
      return {
        ok: false,
        error: `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }

  /**
   * Get subscription details from LemonSqueezy
   */
  async getSubscription(subscriptionId: string): Promise<ServiceResult<SubscriptionData>> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/vnd.api+json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          ok: false,
          error: `LemonSqueezy API error: ${errorData.errors?.[0]?.detail || response.statusText}`,
          code: '500',
        };
      }

      const result = await response.json();
      const subscription = result.data;

      return {
        ok: true,
        data: {
          subscriptionId: subscription.id,
          status: subscription.attributes.status,
          currentPeriodStart: subscription.attributes.current_period_ends_at,
          currentPeriodEnd: subscription.attributes.current_period_ends_at,
          trialStart: subscription.attributes.trial_starts_at,
          trialEnd: subscription.attributes.trial_ends_at,
          cancelAtPeriodEnd: subscription.attributes.cancelled,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: `Failed to get subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<ServiceResult<{ success: boolean }>> {
    try {
      const response = await fetch(`${this.baseUrl}/subscriptions/${subscriptionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'subscriptions',
            id: subscriptionId,
            attributes: {
              cancelled: true,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          ok: false,
          error: `LemonSqueezy API error: ${errorData.errors?.[0]?.detail || response.statusText}`,
          code: '500',
        };
      }

      return {
        ok: true,
        data: { success: true },
      };
    } catch (error) {
      return {
        ok: false,
        error: `Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // Skip verification in test mode if no webhook secret is provided
    if (!this.config.webhookSecret) {
      console.warn('Test mode: Skipping webhook signature verification');
      return true;
    }

    // LemonSqueezy uses HMAC-SHA256 for webhook verification
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.config.webhookSecret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Handle webhook events
   */
  async handleWebhook(event: any): Promise<ServiceResult<{ processed: boolean }>> {
    try {
      const eventType = event.meta?.event_name;
      
      switch (eventType) {
        case 'subscription_created':
        case 'subscription_updated':
        case 'subscription_cancelled':
        case 'subscription_resumed':
          // Handle subscription events
          return {
            ok: true,
            data: { processed: true },
          };
        
        case 'order_created':
        case 'order_refunded':
          // Handle order events
          return {
            ok: true,
            data: { processed: true },
          };
        
        default:
          return {
            ok: true,
            data: { processed: false },
          };
      }
    } catch (error) {
      return {
        ok: false,
        error: `Failed to process webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }
}

// Export singleton instance
export const paymentProviderService = new PaymentProviderService();
