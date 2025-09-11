/**
 * Generic Payment Provider Configuration
 * This allows for dynamic provider support without hardcoding provider lists
 */

export interface ProviderConfig {
  name: string;
  displayName: string;
  enabled: boolean;
  requiresStoreId?: boolean;
  requiresWebhookSecret?: boolean;
  apiKeyEnvVar: string;
  storeIdEnvVar?: string;
  webhookSecretEnvVar?: string;
  webhookPath?: string;
}

export const SUPPORTED_PROVIDERS: Record<string, ProviderConfig> = {
  stripe: {
    name: 'stripe',
    displayName: 'Stripe',
    enabled: true,
    requiresStoreId: false,
    requiresWebhookSecret: true,
    apiKeyEnvVar: 'STRIPE_SECRET_KEY',
    webhookSecretEnvVar: 'STRIPE_WEBHOOK_SECRET',
    webhookPath: '/billing/webhook/stripe',
  },
  paypal: {
    name: 'paypal',
    displayName: 'PayPal',
    enabled: true,
    requiresStoreId: false,
    requiresWebhookSecret: true,
    apiKeyEnvVar: 'PAYPAL_CLIENT_SECRET',
    webhookSecretEnvVar: 'PAYPAL_WEBHOOK_SECRET',
    webhookPath: '/billing/webhook/paypal',
  },
  razorpay: {
    name: 'razorpay',
    displayName: 'Razorpay',
    enabled: true,
    requiresStoreId: false,
    requiresWebhookSecret: true,
    apiKeyEnvVar: 'RAZORPAY_SECRET_KEY',
    webhookSecretEnvVar: 'RAZORPAY_WEBHOOK_SECRET',
    webhookPath: '/billing/webhook/razorpay',
  },
  square: {
    name: 'square',
    displayName: 'Square',
    enabled: true,
    requiresStoreId: false,
    requiresWebhookSecret: true,
    apiKeyEnvVar: 'SQUARE_ACCESS_TOKEN',
    webhookSecretEnvVar: 'SQUARE_WEBHOOK_SECRET',
    webhookPath: '/billing/webhook/square',
  },
  lemonsqueezy: {
    name: 'lemonsqueezy',
    displayName: 'LemonSqueezy',
    enabled: true,
    requiresStoreId: false, // Can test API without store, but store needed for checkouts
    requiresWebhookSecret: false, // Optional for test mode
    apiKeyEnvVar: 'LEMONSQUEEZY_API_KEY',
    storeIdEnvVar: 'LEMONSQUEEZY_STORE_ID',
    webhookSecretEnvVar: 'LEMONSQUEEZY_WEBHOOK_SECRET',
    webhookPath: '/billing/webhook/lemonsqueezy',
  },
  // Add more providers as needed
  paddle: {
    name: 'paddle',
    displayName: 'Paddle',
    enabled: true,
    requiresStoreId: false,
    requiresWebhookSecret: true,
    apiKeyEnvVar: 'PADDLE_API_KEY',
    webhookSecretEnvVar: 'PADDLE_WEBHOOK_SECRET',
    webhookPath: '/billing/webhook/paddle',
  },
};

/**
 * Get enabled providers based on environment configuration
 */
export function getEnabledProviders(): ProviderConfig[] {
  return Object.values(SUPPORTED_PROVIDERS).filter(provider => {
    if (!provider.enabled) return false;
    
    // Check if API key is available
    if (!process.env[provider.apiKeyEnvVar]) return false;
    
    // Check store ID requirement
    if (provider.requiresStoreId && !process.env[provider.storeIdEnvVar!]) {
      console.warn(`Provider ${provider.name} requires store ID but ${provider.storeIdEnvVar} is not set`);
      return false;
    } else if (!provider.requiresStoreId && !process.env[provider.storeIdEnvVar!]) {
      console.warn(`Provider ${provider.name} store ID not set - using test mode`);
    }
    
    return true;
  });
}

/**
 * Get provider configuration by name
 */
export function getProviderConfig(providerName: string): ProviderConfig | null {
  return SUPPORTED_PROVIDERS[providerName] || null;
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(providerName: string): { valid: boolean; errors: string[] } {
  const config = getProviderConfig(providerName);
  const errors: string[] = [];

  if (!config) {
    return { valid: false, errors: [`Unknown provider: ${providerName}`] };
  }

  if (!config.enabled) {
    errors.push(`Provider ${providerName} is disabled`);
  }

  if (!process.env[config.apiKeyEnvVar]) {
    errors.push(`Missing API key: ${config.apiKeyEnvVar}`);
  }

  if (config.requiresStoreId && !process.env[config.storeIdEnvVar!]) {
    errors.push(`Missing store ID: ${config.storeIdEnvVar}`);
  } else if (!config.requiresStoreId && !process.env[config.storeIdEnvVar!]) {
    // Optional store ID - just warn
    console.warn(`Store ID ${config.storeIdEnvVar} not set for ${providerName} - using test mode`);
  }

  if (config.requiresWebhookSecret && !process.env[config.webhookSecretEnvVar!]) {
    errors.push(`Missing webhook secret: ${config.webhookSecretEnvVar}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get provider names for validation (used in Zod schemas)
 */
export function getProviderNames(): string[] {
  return Object.keys(SUPPORTED_PROVIDERS);
}

/**
 * Get enabled provider names
 */
export function getEnabledProviderNames(): string[] {
  return getEnabledProviders().map(p => p.name);
}
