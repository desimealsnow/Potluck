/**
 * payment-core Example Usage
 * 
 * This file shows basic usage of the payment-core package.
 * Copy and adapt this code for your application.
 */

import { PaymentService, providerRegistry, createWebhookHandler } from 'payment-core';

// Example: Basic payment service setup
export function createExamplePaymentService() {
  return new PaymentService({
    providers: providerRegistry,
    persistence: {
      // Implement your persistence adapter
      async saveSubscription(subscription) {
        console.log('Saving subscription:', subscription);
        return subscription;
      },
      // ... other persistence methods
    },
    events: {
      // Implement your event publisher
      async publish(event) {
        console.log('Publishing event:', event);
      }
    },
    logger: {
      // Implement your logger
      info: (message) => console.log(`[INFO] ${message}`),
      error: (message) => console.error(`[ERROR] ${message}`),
      warn: (message) => console.warn(`[WARN] ${message}`)
    },
    metrics: {
      // Implement your metrics
      increment: (name, tags) => console.log(`[METRIC] ${name}`, tags),
      timing: (name, duration, tags) => console.log(`[TIMING] ${name}: ${duration}ms`, tags)
    },
    configs: {
      // Implement your config store
      async getProviderConfig(provider, tenantId) {
        return {
          provider,
          tenantId,
          liveMode: false,
          credentials: {
            apiKey: process.env.LEMONSQUEEZY_API_KEY,
            signingSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET
          },
          defaultCurrency: 'USD'
        };
      }
    },
    inbox: {
      // Implement your webhook inbox
      async isProcessed(provider, eventId) {
        return false; // Simple implementation
      },
      async markProcessed(provider, eventId) {
        console.log(`Marked ${provider}:${eventId} as processed`);
      }
    },
    idempotency: {
      // Implement your idempotency store
      async get(key) {
        return null; // Simple implementation
      },
      async set(key, result) {
        console.log(`Stored idempotency key: ${key}`);
      }
    }
  });
}

// Example: Create checkout
export async function createCheckoutExample() {
  const service = createExamplePaymentService();
  
  try {
    const checkout = await service.createCheckout({
      tenantId: 'default',
      planId: 'your-plan-id',
      userId: 'user-123',
      userEmail: 'user@example.com',
      provider: 'lemonsqueezy'
    });
    
    console.log('Checkout created:', checkout);
    return checkout;
  } catch (error) {
    console.error('Checkout creation failed:', error);
    throw error;
  }
}

// Example: Express webhook handler
export function setupWebhookHandler(app) {
  const service = createExamplePaymentService();
  
  // Mount webhook route
  app.post('/billing/webhook/:provider', 
    // Add raw body parser middleware here
    createWebhookHandler(service)
  );
  
  console.log('Webhook handler mounted at /billing/webhook/:provider');
}

// Example: Run the example
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Running payment-core example...');
  
  createCheckoutExample()
    .then(checkout => {
      console.log('✅ Example completed successfully!');
      console.log('Checkout URL:', checkout.checkoutUrl);
    })
    .catch(error => {
      console.error('❌ Example failed:', error.message);
    });
}
