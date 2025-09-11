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
        // For test mode without store ID, we can test the API connection
        // but we need a store ID to create actual checkouts
        if (!this.config.storeId) {
          console.warn('Test mode: No store ID configured. Testing API connection only.');
          console.warn('According to LemonSqueezy docs: Store is required for API calls, but starts in test mode by default.');
          console.warn('To create real checkouts, you need to:');
          console.warn('1. Go to https://lemonsqueezy.com and create an account');
          console.warn('2. Create a store (automatically starts in test mode)');
          console.warn('3. Get the store ID from your dashboard');
          console.warn('4. Set LEMONSQUEEZY_STORE_ID in your .env file');
          console.warn('5. See LEMONSQUEEZY_TEST_SETUP.md for detailed instructions');
          
          // Test API connection without creating checkout
          try {
            const testResponse = await fetch('https://api.lemonsqueezy.com/v1/stores', {
              headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/vnd.api+json',
              },
            });

            if (testResponse.ok) {
              console.log('✅ LemonSqueezy API connection successful');
              const data = await testResponse.json();
              console.log(`📊 Found ${data.data.length} store(s) in your account`);
              
              if (data.data.length > 0) {
                console.log('Available stores:');
                data.data.forEach((store: any) => {
                  console.log(`  - ${store.id}: ${store.attributes.name}`);
                });
                console.log('💡 To enable checkout creation, set LEMONSQUEEZY_STORE_ID to one of the above store IDs');
              } else {
                console.log('💡 No stores found. Create a store in your LemonSqueezy dashboard first.');
              }
              
              return {
                ok: false,
                error: 'LemonSqueezy API connection successful, but no store ID configured. Please set LEMONSQUEEZY_STORE_ID in your .env file. See server logs for available stores.',
                code: '400',
                debug: {
                  availableStores: data.data.map((store: any) => ({
                    id: store.id,
                    name: store.attributes.name
                  }))
                }
              };
            } else {
              throw new Error(`API test failed: ${testResponse.status}`);
            }
          } catch (error) {
            console.error('❌ LemonSqueezy API test failed:', error);
            return {
              ok: false,
              error: 'LemonSqueezy API connection failed. Please check your LEMONSQUEEZY_API_KEY. See server logs for details.',
              code: '500',
            };
          }
        }

      console.log('🛒 Creating LemonSqueezy checkout with data:', {
        storeId: this.config.storeId,
        planId: data.planId,
        userEmail: data.userEmail,
        userName: data.userName
      });

      // Check if store has products first
      const productsResponse = await fetch(`${this.baseUrl}/products?filter[store_id]=${this.config.storeId}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Accept': 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
        },
      });

      if (!productsResponse.ok) {
        throw new Error(`Failed to fetch products: ${productsResponse.status}`);
      }

      const productsData = await productsResponse.json();
      console.log(`📦 Found ${productsData.data.length} product(s) in store`);

      if (productsData.data.length === 0) {
        console.warn('⚠️ No products found in store. Cannot create checkout without products.');
        console.warn('For testing purposes, you can:');
        console.warn('1. Create a test product in your LemonSqueezy dashboard');
        console.warn('2. Or use test mode without checkout creation');
        
        // For testing, guide users to create test products and get real checkout URLs
        console.warn('⚠️ No products found in store. Integration test passed - API connection works.');
        console.warn('According to LemonSqueezy docs: Test mode requires creating test products to get real checkout URLs.');
        console.warn('This is the correct way to test LemonSqueezy integration.');
        
        return {
          ok: false,
          error: 'No test products found in LemonSqueezy store. Please create test products to get real checkout URLs.',
          code: '400',
          debug: {
            storeId: this.config.storeId,
            productsCount: 0,
            message: 'LemonSqueezy integration working. Store accessible but no test products found.',
            nextSteps: [
              '1. Go to your LemonSqueezy dashboard (test mode enabled)',
              '2. Create test products with variants',
              '3. Copy the checkout URLs from your test products',
              '4. Update your billing_plans table with these checkout URLs',
              '5. Test with real LemonSqueezy checkout URLs and test card numbers'
            ],
            testCardNumbers: [
              'Visa: 4242 4242 4242 4242',
              'Mastercard: 5555 5555 5555 4444',
              'Insufficient funds: 4000 0000 0000 9995'
            ]
          }
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
                redirect_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/success`,
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
        console.error('❌ LemonSqueezy checkout creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        return {
          ok: false,
          error: `LemonSqueezy API error: ${errorData.errors?.[0]?.detail || response.statusText}`,
          code: '500',
          debug: {
            status: response.status,
            statusText: response.statusText,
            error: errorData,
            requestData: {
              storeId: this.config.storeId,
              planId: data.planId,
              userEmail: data.userEmail
            }
          }
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
      console.log('🔔 LemonSqueezy webhook received:', {
        eventType,
        eventId: event.meta?.event_id,
        timestamp: event.meta?.created_at
      });
      
      switch (eventType) {
        case 'subscription_created':
          return await this.handleSubscriptionCreated(event);
        
        case 'subscription_updated':
          return await this.handleSubscriptionUpdated(event);
        
        case 'subscription_cancelled':
          return await this.handleSubscriptionCancelled(event);
        
        case 'subscription_resumed':
          return await this.handleSubscriptionResumed(event);
        
        case 'order_created':
          return await this.handleOrderCreated(event);
        
        case 'order_refunded':
          return await this.handleOrderRefunded(event);
        
        default:
          console.log(`⚠️ Unhandled webhook event type: ${eventType}`);
          return {
            ok: true,
            data: { processed: false },
          };
      }
    } catch (error) {
      console.error('❌ Webhook processing error:', error);
      return {
        ok: false,
        error: `Webhook processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }

  /**
   * Handle subscription created event
   */
  private async handleSubscriptionCreated(event: any): Promise<ServiceResult<{ processed: boolean }>> {
    try {
      const subscription = event.data;
      console.log('✅ Subscription created:', {
        id: subscription.id,
        status: subscription.attributes.status,
        customerId: subscription.attributes.customer_id,
        productId: subscription.attributes.product_id,
        variantId: subscription.attributes.variant_id
      });

      // TODO: Update database with new subscription
      // This would typically involve:
      // 1. Creating subscription record in database
      // 2. Updating user's subscription status
      // 3. Sending welcome email
      // 4. Logging the event

      return {
        ok: true,
        data: { processed: true },
      };
    } catch (error) {
      console.error('❌ Error handling subscription created:', error);
      return {
        ok: false,
        error: `Failed to handle subscription created: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }

  /**
   * Handle subscription updated event
   */
  private async handleSubscriptionUpdated(event: any): Promise<ServiceResult<{ processed: boolean }>> {
    try {
      const subscription = event.data;
      console.log('🔄 Subscription updated:', {
        id: subscription.id,
        status: subscription.attributes.status,
        customerId: subscription.attributes.customer_id
      });

      // TODO: Update database with subscription changes
      // This would typically involve:
      // 1. Updating subscription record in database
      // 2. Updating user's subscription status
      // 3. Sending notification email if needed

      return {
        ok: true,
        data: { processed: true },
      };
    } catch (error) {
      console.error('❌ Error handling subscription updated:', error);
      return {
        ok: false,
        error: `Failed to handle subscription updated: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }

  /**
   * Handle subscription cancelled event
   */
  private async handleSubscriptionCancelled(event: any): Promise<ServiceResult<{ processed: boolean }>> {
    try {
      const subscription = event.data;
      console.log('❌ Subscription cancelled:', {
        id: subscription.id,
        status: subscription.attributes.status,
        customerId: subscription.attributes.customer_id
      });

      // TODO: Update database with subscription cancellation
      // This would typically involve:
      // 1. Updating subscription status to cancelled
      // 2. Updating user's access permissions
      // 3. Sending cancellation confirmation email

      return {
        ok: true,
        data: { processed: true },
      };
    } catch (error) {
      console.error('❌ Error handling subscription cancelled:', error);
      return {
        ok: false,
        error: `Failed to handle subscription cancelled: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }

  /**
   * Handle subscription resumed event
   */
  private async handleSubscriptionResumed(event: any): Promise<ServiceResult<{ processed: boolean }>> {
    try {
      const subscription = event.data;
      console.log('🔄 Subscription resumed:', {
        id: subscription.id,
        status: subscription.attributes.status,
        customerId: subscription.attributes.customer_id
      });

      // TODO: Update database with subscription resumption
      // This would typically involve:
      // 1. Updating subscription status to active
      // 2. Restoring user's access permissions
      // 3. Sending resumption confirmation email

      return {
        ok: true,
        data: { processed: true },
      };
    } catch (error) {
      console.error('❌ Error handling subscription resumed:', error);
      return {
        ok: false,
        error: `Failed to handle subscription resumed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }

  /**
   * Handle order created event
   */
  private async handleOrderCreated(event: any): Promise<ServiceResult<{ processed: boolean }>> {
    try {
      const order = event.data;
      console.log('🛒 Order created:', {
        id: order.id,
        status: order.attributes.status,
        customerId: order.attributes.customer_id,
        total: order.attributes.total
      });

      // TODO: Update database with new order
      // This would typically involve:
      // 1. Creating order record in database
      // 2. Creating invoice record
      // 3. Sending order confirmation email

      return {
        ok: true,
        data: { processed: true },
      };
    } catch (error) {
      console.error('❌ Error handling order created:', error);
      return {
        ok: false,
        error: `Failed to handle order created: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }

  /**
   * Handle order refunded event
   */
  private async handleOrderRefunded(event: any): Promise<ServiceResult<{ processed: boolean }>> {
    try {
      const order = event.data;
      console.log('💰 Order refunded:', {
        id: order.id,
        status: order.attributes.status,
        customerId: order.attributes.customer_id,
        refundAmount: order.attributes.refund_amount
      });

      // TODO: Update database with refund information
      // This would typically involve:
      // 1. Updating order status to refunded
      // 2. Creating refund record
      // 3. Updating user's subscription if needed
      // 4. Sending refund confirmation email

      return {
        ok: true,
        data: { processed: true },
      };
    } catch (error) {
      console.error('❌ Error handling order refunded:', error);
      return {
        ok: false,
        error: `Failed to handle order refunded: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: '500',
      };
    }
  }
}

// Export singleton instance
export const paymentProviderService = new PaymentProviderService();
