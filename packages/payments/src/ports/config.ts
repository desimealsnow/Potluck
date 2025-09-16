export interface ProviderConfig {
  provider: 'lemonsqueezy' | 'stripe' | 'paypal';
  tenantId: string;
  liveMode: boolean;
  credentials: Record<string, string>;
  defaultCurrency?: string;
}

export interface ProviderConfigStore {
  getConfig(tenantId: string, provider: string): Promise<ProviderConfig | null>;
  listEnabledProviders(tenantId: string): Promise<ProviderConfig[]>;
}


