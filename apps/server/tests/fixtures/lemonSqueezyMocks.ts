/**
 * LemonSqueezy API Mock Data for Testing
 * 
 * This file contains comprehensive mock data for LemonSqueezy API responses
 * to enable thorough testing of payment and invoice functionality.
 */

import { faker } from '@faker-js/faker';

// LemonSqueezy API Response Types
export interface LemonSqueezyStore {
  id: string;
  type: 'stores';
  attributes: {
    name: string;
    slug: string;
    domain: string;
    url: string;
    avatar_url: string;
    plan: string;
    country: string;
    country_nicename: string;
    currency: string;
    total_sales: number;
    thirty_day_sales: number;
    created_at: string;
    updated_at: string;
  };
}

export interface LemonSqueezyProduct {
  id: string;
  type: 'products';
  attributes: {
    store_id: number;
    name: string;
    slug: string;
    description: string;
    status: 'draft' | 'published';
    status_formatted: string;
    thumb_url: string;
    large_thumb_url: string;
    price: number;
    price_formatted: string;
    from_price: number;
    to_price: number;
    pay_what_you_want: boolean;
    buy_now_url: string;
    created_at: string;
    updated_at: string;
  };
}

export interface LemonSqueezyVariant {
  id: string;
  type: 'variants';
  attributes: {
    product_id: number;
    name: string;
    slug: string;
    description: string;
    price: number;
    is_subscription: boolean;
    interval: 'day' | 'week' | 'month' | 'year' | null;
    interval_count: number;
    has_free_trial: boolean;
    trial_interval: 'day' | 'week' | 'month' | 'year' | null;
    trial_interval_count: number;
    pay_what_you_want: boolean;
    min_price: number;
    suggested_price: number;
    status: 'pending' | 'draft' | 'published';
    status_formatted: string;
    created_at: string;
    updated_at: string;
  };
}

export interface LemonSqueezyCheckout {
  id: string;
  type: 'checkouts';
  attributes: {
    store_id: number;
    variant_id: number;
    custom_price: number | null;
    product_options: {
      name: string;
      description: string;
      media: string[];
      redirect_url: string;
      receipt_button_text: string;
      receipt_link_url: string;
      receipt_thank_you_note: string;
      enabled_variants: number[];
    };
    checkout_options: {
      embed: boolean;
      media: boolean;
      logo: boolean;
      desc: boolean;
      discount: boolean;
      dark: boolean;
      subscription_preview: boolean;
      button_color: string;
    };
    checkout_data: {
      email: string;
      name: string;
      billing_address: any;
      tax_number: string;
      discount_code: string;
      custom: Record<string, any>;
      variant_quantities: any[];
    };
    url: string;
    created_at: string;
    updated_at: string;
  };
}

export interface LemonSqueezySubscription {
  id: string;
  type: 'subscriptions';
  attributes: {
    store_id: number;
    customer_id: number;
    order_id: number;
    order_item_id: number;
    product_id: number;
    variant_id: number;
    product_name: string;
    variant_name: string;
    user_name: string;
    user_email: string;
    status: 'on_trial' | 'active' | 'paused' | 'past_due' | 'unpaid' | 'cancelled' | 'expired';
    status_formatted: string;
    card_brand: string;
    card_last_four: string;
    pause: {
      mode: 'void' | 'free';
      resumes_at: string | null;
    } | null;
    cancelled: boolean;
    trial_ends_at: string | null;
    billing_anchor: number;
    first_subscription_item: {
      id: number;
      subscription_id: number;
      price_id: number;
      quantity: number;
      created_at: string;
      updated_at: string;
    } | null;
    urls: {
      update_payment_method: string;
      customer_portal: string;
    };
    renews_at: string;
    ends_at: string | null;
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
}

export interface LemonSqueezyCustomer {
  id: string;
  type: 'customers';
  attributes: {
    store_id: number;
    name: string;
    email: string;
    status: 'active' | 'archived';
    city: string | null;
    region: string | null;
    country: string;
    total_revenue_currency: number;
    mrr: number;
    status_formatted: string;
    country_formatted: string;
    total_revenue_currency_formatted: string;
    mrr_formatted: string;
    urls: {
      customer_portal: string;
    };
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
}

export interface LemonSqueezyOrder {
  id: string;
  type: 'orders';
  attributes: {
    store_id: number;
    customer_id: number;
    identifier: string;
    order_number: number;
    user_name: string;
    user_email: string;
    currency: string;
    currency_rate: string;
    subtotal: number;
    discount_total: number;
    tax: number;
    total: number;
    subtotal_usd: number;
    discount_total_usd: number;
    tax_usd: number;
    total_usd: number;
    tax_name: string;
    tax_rate: string;
    status: 'pending' | 'failed' | 'paid' | 'refunded' | 'partial_refund';
    status_formatted: string;
    refunded: boolean;
    refunded_at: string | null;
    subtotal_formatted: string;
    discount_total_formatted: string;
    tax_formatted: string;
    total_formatted: string;
    urls: {
      receipt: string;
    };
    created_at: string;
    updated_at: string;
    test_mode: boolean;
  };
}

export interface LemonSqueezyWebhookEvent {
  meta: {
    event_name: string;
    webhook_id: string;
    custom_data: Record<string, any>;
  };
  data: {
    type: string;
    id: string;
    attributes: Record<string, any>;
    relationships?: Record<string, any>;
  };
}

/**
 * Mock Factory for LemonSqueezy API responses
 */
export class LemonSqueezyMockFactory {
  /**
   * Generate a mock store
   */
  static createStore(overrides?: Partial<LemonSqueezyStore['attributes']>): LemonSqueezyStore {
    return {
      id: faker.number.int({ min: 1000, max: 9999 }).toString(),
      type: 'stores',
      attributes: {
        name: faker.company.name() + ' Store',
        slug: faker.lorem.slug(),
        domain: faker.internet.domainName(),
        url: faker.internet.url(),
        avatar_url: faker.image.avatar(),
        plan: faker.helpers.arrayElement(['free', 'starter', 'small', 'medium', 'large']),
        country: 'US',
        country_nicename: 'United States',
        currency: 'USD',
        total_sales: faker.number.int({ min: 0, max: 1000000 }),
        thirty_day_sales: faker.number.int({ min: 0, max: 50000 }),
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        ...overrides,
      },
    };
  }

  /**
   * Generate a mock product
   */
  static createProduct(overrides?: Partial<LemonSqueezyProduct['attributes']>): LemonSqueezyProduct {
    const price = faker.number.int({ min: 500, max: 5000 }); // cents
    return {
      id: faker.number.int({ min: 10000, max: 99999 }).toString(),
      type: 'products',
      attributes: {
        store_id: faker.number.int({ min: 1000, max: 9999 }),
        name: faker.commerce.productName() + ' Plan',
        slug: faker.lorem.slug(),
        description: faker.lorem.paragraphs(2),
        status: 'published',
        status_formatted: 'Published',
        thumb_url: faker.image.url(),
        large_thumb_url: faker.image.url(),
        price: price,
        price_formatted: `$${(price / 100).toFixed(2)}`,
        from_price: price,
        to_price: price,
        pay_what_you_want: false,
        buy_now_url: faker.internet.url(),
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        ...overrides,
      },
    };
  }

  /**
   * Generate a mock subscription variant
   */
  static createVariant(overrides?: Partial<LemonSqueezyVariant['attributes']>): LemonSqueezyVariant {
    const intervals = ['month', 'year'] as const;
    const interval = faker.helpers.arrayElement(intervals);
    return {
      id: faker.number.int({ min: 100000, max: 999999 }).toString(),
      type: 'variants',
      attributes: {
        product_id: faker.number.int({ min: 10000, max: 99999 }),
        name: faker.commerce.productName(),
        slug: faker.lorem.slug(),
        description: faker.lorem.sentence(),
        price: faker.number.int({ min: 999, max: 9999 }),
        is_subscription: true,
        interval,
        interval_count: 1,
        has_free_trial: faker.datatype.boolean(),
        trial_interval: faker.datatype.boolean() ? 'day' : null,
        trial_interval_count: faker.number.int({ min: 7, max: 30 }),
        pay_what_you_want: false,
        min_price: 0,
        suggested_price: 0,
        status: 'published',
        status_formatted: 'Published',
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        ...overrides,
      },
    };
  }

  /**
   * Generate a mock checkout session
   */
  static createCheckout(overrides?: Partial<LemonSqueezyCheckout['attributes']>): LemonSqueezyCheckout {
    const variantId = faker.number.int({ min: 100000, max: 999999 });
    return {
      id: faker.string.uuid(),
      type: 'checkouts',
      attributes: {
        store_id: faker.number.int({ min: 1000, max: 9999 }),
        variant_id: variantId,
        custom_price: null,
        product_options: {
          name: faker.commerce.productName(),
          description: faker.lorem.paragraph(),
          media: [],
          redirect_url: 'https://example.com/success',
          receipt_button_text: 'Return to App',
          receipt_link_url: '',
          receipt_thank_you_note: 'Thank you for your purchase!',
          enabled_variants: [variantId],
        },
        checkout_options: {
          embed: false,
          media: true,
          logo: true,
          desc: true,
          discount: true,
          dark: false,
          subscription_preview: true,
          button_color: '#7047EB',
        },
        checkout_data: {
          email: faker.internet.email(),
          name: faker.person.fullName(),
          billing_address: {},
          tax_number: '',
          discount_code: '',
          custom: {
            user_id: faker.string.uuid(),
            plan_id: 'test-plan',
          },
          variant_quantities: [],
        },
        url: `https://potluck.lemonsqueezy.com/checkout/buy/${faker.string.alphanumeric(32)}`,
        created_at: faker.date.recent().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        ...overrides,
      },
    };
  }

  /**
   * Generate a mock subscription
   */
  static createSubscription(overrides?: Partial<LemonSqueezySubscription['attributes']>): LemonSqueezySubscription {
    const status = faker.helpers.arrayElement([
      'on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired'
    ] as const);
    const trialEndsAt = status === 'on_trial' ? faker.date.future().toISOString() : null;
    const renewsAt = faker.date.future({ years: 1 }).toISOString();
    
    return {
      id: faker.number.int({ min: 1000000, max: 9999999 }).toString(),
      type: 'subscriptions',
      attributes: {
        store_id: faker.number.int({ min: 1000, max: 9999 }),
        customer_id: faker.number.int({ min: 10000, max: 99999 }),
        order_id: faker.number.int({ min: 100000, max: 999999 }),
        order_item_id: faker.number.int({ min: 1000000, max: 9999999 }),
        product_id: faker.number.int({ min: 10000, max: 99999 }),
        variant_id: faker.number.int({ min: 100000, max: 999999 }),
        product_name: faker.commerce.productName() + ' Plan',
        variant_name: 'Monthly',
        user_name: faker.person.fullName(),
        user_email: faker.internet.email(),
        status,
        status_formatted: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        card_brand: faker.helpers.arrayElement(['visa', 'mastercard', 'amex']),
        card_last_four: faker.string.numeric(4),
        pause: null,
        cancelled: status === 'cancelled',
        trial_ends_at: trialEndsAt,
        billing_anchor: faker.number.int({ min: 1, max: 28 }),
        first_subscription_item: {
          id: faker.number.int({ min: 1000000, max: 9999999 }),
          subscription_id: faker.number.int({ min: 1000000, max: 9999999 }),
          price_id: faker.number.int({ min: 100000, max: 999999 }),
          quantity: 1,
          created_at: faker.date.past().toISOString(),
          updated_at: faker.date.recent().toISOString(),
        },
        urls: {
          update_payment_method: faker.internet.url(),
          customer_portal: faker.internet.url(),
        },
        renews_at: renewsAt,
        ends_at: status === 'cancelled' ? faker.date.future().toISOString() : null,
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        test_mode: true,
        ...overrides,
      },
    };
  }

  /**
   * Generate a mock customer
   */
  static createCustomer(overrides?: Partial<LemonSqueezyCustomer['attributes']>): LemonSqueezyCustomer {
    const totalRevenue = faker.number.int({ min: 0, max: 50000 });
    const mrr = faker.number.int({ min: 0, max: 5000 });
    
    return {
      id: faker.number.int({ min: 10000, max: 99999 }).toString(),
      type: 'customers',
      attributes: {
        store_id: faker.number.int({ min: 1000, max: 9999 }),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        status: 'active',
        city: faker.location.city(),
        region: faker.location.state(),
        country: 'US',
        total_revenue_currency: totalRevenue,
        mrr: mrr,
        status_formatted: 'Active',
        country_formatted: 'United States',
        total_revenue_currency_formatted: `$${(totalRevenue / 100).toFixed(2)}`,
        mrr_formatted: `$${(mrr / 100).toFixed(2)}`,
        urls: {
          customer_portal: faker.internet.url(),
        },
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        test_mode: true,
        ...overrides,
      },
    };
  }

  /**
   * Generate a mock order (invoice)
   */
  static createOrder(overrides?: Partial<LemonSqueezyOrder['attributes']>): LemonSqueezyOrder {
    const subtotal = faker.number.int({ min: 999, max: 9999 });
    const discountTotal = faker.number.int({ min: 0, max: subtotal * 0.2 });
    const tax = Math.round(subtotal * 0.08); // 8% tax
    const total = subtotal - discountTotal + tax;
    const status = faker.helpers.arrayElement([
      'pending', 'paid', 'failed', 'refunded', 'partial_refund'
    ] as const);
    
    return {
      id: faker.number.int({ min: 100000, max: 999999 }).toString(),
      type: 'orders',
      attributes: {
        store_id: faker.number.int({ min: 1000, max: 9999 }),
        customer_id: faker.number.int({ min: 10000, max: 99999 }),
        identifier: faker.string.alphanumeric(16).toUpperCase(),
        order_number: faker.number.int({ min: 10000, max: 99999 }),
        user_name: faker.person.fullName(),
        user_email: faker.internet.email(),
        currency: 'USD',
        currency_rate: '1.000000',
        subtotal: subtotal,
        discount_total: discountTotal,
        tax: tax,
        total: total,
        subtotal_usd: subtotal,
        discount_total_usd: discountTotal,
        tax_usd: tax,
        total_usd: total,
        tax_name: 'Sales Tax',
        tax_rate: '0.08',
        status,
        status_formatted: status.charAt(0).toUpperCase() + status.slice(1),
        refunded: status === 'refunded',
        refunded_at: status === 'refunded' ? faker.date.recent().toISOString() : null,
        subtotal_formatted: `$${(subtotal / 100).toFixed(2)}`,
        discount_total_formatted: `$${(discountTotal / 100).toFixed(2)}`,
        tax_formatted: `$${(tax / 100).toFixed(2)}`,
        total_formatted: `$${(total / 100).toFixed(2)}`,
        urls: {
          receipt: faker.internet.url(),
        },
        created_at: faker.date.past().toISOString(),
        updated_at: faker.date.recent().toISOString(),
        test_mode: true,
        ...overrides,
      },
    };
  }

  /**
   * Generate webhook events for different scenarios
   */
  static createWebhookEvent(
    eventName: string, 
    resourceType: string, 
    resourceData: any,
    customData: Record<string, any> = {}
  ): LemonSqueezyWebhookEvent {
    return {
      meta: {
        event_name: eventName,
        webhook_id: faker.string.uuid(),
        custom_data: customData,
      },
      data: {
        type: resourceType,
        id: faker.string.uuid(),
        attributes: resourceData,
        relationships: {},
      },
    };
  }

  /**
   * Pre-built webhook events for common scenarios
   */
  static webhookEvents = {
    subscriptionCreated: (userId: string = faker.string.uuid()) => 
      this.createWebhookEvent(
        'subscription_created',
        'subscriptions',
        this.createSubscription({ status: 'active' }).attributes,
        { user_id: userId }
      ),

    subscriptionUpdated: (userId: string = faker.string.uuid()) => 
      this.createWebhookEvent(
        'subscription_updated',
        'subscriptions',
        this.createSubscription({ status: 'active' }).attributes,
        { user_id: userId }
      ),

    subscriptionCancelled: (userId: string = faker.string.uuid()) => 
      this.createWebhookEvent(
        'subscription_cancelled',
        'subscriptions',
        this.createSubscription({ status: 'cancelled', cancelled: true }).attributes,
        { user_id: userId }
      ),

    subscriptionPaused: (userId: string = faker.string.uuid()) => 
      this.createWebhookEvent(
        'subscription_paused',
        'subscriptions',
        this.createSubscription({ status: 'paused' }).attributes,
        { user_id: userId }
      ),

    subscriptionResumed: (userId: string = faker.string.uuid()) => 
      this.createWebhookEvent(
        'subscription_resumed',
        'subscriptions',
        this.createSubscription({ status: 'active' }).attributes,
        { user_id: userId }
      ),

    orderCreated: (userId: string = faker.string.uuid()) => 
      this.createWebhookEvent(
        'order_created',
        'orders',
        this.createOrder({ status: 'paid' }).attributes,
        { user_id: userId }
      ),

    orderRefunded: (userId: string = faker.string.uuid()) => 
      this.createWebhookEvent(
        'order_refunded',
        'orders',
        this.createOrder({ status: 'refunded', refunded: true }).attributes,
        { user_id: userId }
      ),
  };
}

/**
 * LemonSqueezy API Response Mock Data Sets
 */
export const LemonSqueezyMockData = {
  // Stores
  stores: {
    list: [
      LemonSqueezyMockFactory.createStore({ name: 'Potluck Store', currency: 'USD' }),
      LemonSqueezyMockFactory.createStore({ name: 'Test Store 2', currency: 'EUR' }),
    ],
  },

  // Products and Variants
  products: {
    basic: LemonSqueezyMockFactory.createProduct({ 
      name: 'Basic Plan', 
      price: 999, 
      price_formatted: '$9.99' 
    }),
    premium: LemonSqueezyMockFactory.createProduct({ 
      name: 'Premium Plan', 
      price: 1999, 
      price_formatted: '$19.99' 
    }),
    pro: LemonSqueezyMockFactory.createProduct({ 
      name: 'Pro Plan', 
      price: 4999, 
      price_formatted: '$49.99' 
    }),
  },

  variants: {
    basic_monthly: LemonSqueezyMockFactory.createVariant({
      name: 'Basic Monthly',
      price: 999,
      interval: 'month',
      has_free_trial: true,
      trial_interval_count: 14,
    }),
    basic_yearly: LemonSqueezyMockFactory.createVariant({
      name: 'Basic Yearly',
      price: 9999,
      interval: 'year',
      has_free_trial: true,
      trial_interval_count: 14,
    }),
    premium_monthly: LemonSqueezyMockFactory.createVariant({
      name: 'Premium Monthly',
      price: 1999,
      interval: 'month',
    }),
    pro_monthly: LemonSqueezyMockFactory.createVariant({
      name: 'Pro Monthly',
      price: 4999,
      interval: 'month',
    }),
  },

  // Sample data for different subscription states
  subscriptions: {
    active: LemonSqueezyMockFactory.createSubscription({ status: 'active' }),
    trial: LemonSqueezyMockFactory.createSubscription({ 
      status: 'on_trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    cancelled: LemonSqueezyMockFactory.createSubscription({ 
      status: 'cancelled',
      cancelled: true,
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }),
    pastDue: LemonSqueezyMockFactory.createSubscription({ status: 'past_due' }),
    paused: LemonSqueezyMockFactory.createSubscription({ 
      status: 'paused',
      pause: {
        mode: 'void',
        resumes_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    }),
  },

  // Orders (invoices)
  orders: {
    paid: LemonSqueezyMockFactory.createOrder({ status: 'paid' }),
    pending: LemonSqueezyMockFactory.createOrder({ status: 'pending' }),
    failed: LemonSqueezyMockFactory.createOrder({ status: 'failed' }),
    refunded: LemonSqueezyMockFactory.createOrder({ status: 'refunded', refunded: true }),
  },

  // Common API responses
  apiResponses: {
    storesList: {
      data: [
        (() => { const store = LemonSqueezyMockFactory.createStore({ name: 'Potluck Store' }); return { ...store, id: '12345' }; })(),
      ],
      meta: {
        page: {
          currentPage: 1,
          from: 1,
          to: 1,
          per_page: 10,
          total: 1,
        },
      },
    },

    productsList: (storeId: string) => ({
      data: [
        LemonSqueezyMockData.products.basic,
        LemonSqueezyMockData.products.premium,
        LemonSqueezyMockData.products.pro,
      ],
      meta: {
        page: {
          currentPage: 1,
          from: 1,
          to: 3,
          per_page: 10,
          total: 3,
        },
      },
    }),

    variantsList: (productId: string) => ({
      data: [
        LemonSqueezyMockData.variants.basic_monthly,
        LemonSqueezyMockData.variants.basic_yearly,
      ],
      meta: {
        page: {
          currentPage: 1,
          from: 1,
          to: 2,
          per_page: 10,
          total: 2,
        },
      },
    }),

    checkoutCreated: (variantId: string) => ({
      data: LemonSqueezyMockFactory.createCheckout({
        variant_id: parseInt(variantId),
        url: `https://potluck.lemonsqueezy.com/checkout/buy/${faker.string.alphanumeric(32)}`,
      }),
    }),

    subscriptionCreated: {
      data: LemonSqueezyMockFactory.createSubscription({ status: 'active' }),
    },

    subscriptionUpdated: {
      data: LemonSqueezyMockFactory.createSubscription({ status: 'active' }),
    },

    subscriptionCancelled: {
      data: LemonSqueezyMockFactory.createSubscription({ status: 'cancelled', cancelled: true }),
    },

    orderCreated: {
      data: LemonSqueezyMockFactory.createOrder({ status: 'paid' }),
    },
  },
};

/**
 * Helper to generate test scenarios with realistic data
 */
export class LemonSqueezyTestScenarios {
  /**
   * Complete subscription lifecycle
   */
  static subscriptionLifecycle(userId: string) {
    return {
      trial: LemonSqueezyMockFactory.createSubscription({
        status: 'on_trial',
        trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      }),
      active: LemonSqueezyMockFactory.createSubscription({ status: 'active' }),
      pastDue: LemonSqueezyMockFactory.createSubscription({ status: 'past_due' }),
      cancelled: LemonSqueezyMockFactory.createSubscription({ 
        status: 'cancelled', 
        cancelled: true 
      }),
    };
  }

  /**
   * Payment failure recovery scenario
   */
  static paymentFailureRecovery(userId: string) {
    return {
      failedPayment: LemonSqueezyMockFactory.createOrder({ status: 'failed' }),
      pastDueSubscription: LemonSqueezyMockFactory.createSubscription({ status: 'past_due' }),
      recoveredPayment: LemonSqueezyMockFactory.createOrder({ status: 'paid' }),
      reactivatedSubscription: LemonSqueezyMockFactory.createSubscription({ status: 'active' }),
    };
  }

  /**
   * Refund scenario
   */
  static refundScenario(userId: string) {
    return {
      originalOrder: LemonSqueezyMockFactory.createOrder({ status: 'paid' }),
      refundedOrder: LemonSqueezyMockFactory.createOrder({ 
        status: 'refunded', 
        refunded: true,
        refunded_at: new Date().toISOString(),
      }),
      cancelledSubscription: LemonSqueezyMockFactory.createSubscription({ 
        status: 'cancelled', 
        cancelled: true 
      }),
    };
  }
}
