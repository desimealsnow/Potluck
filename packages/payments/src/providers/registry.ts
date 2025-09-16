import type { PaymentProvider, ProviderRegistry } from '../ports/provider';

const registry = new Map<string, PaymentProvider>();

export const providerRegistry: ProviderRegistry = {
  get(name: string) {
    return registry.get(name);
  }
};

export function registerProvider(name: string, provider: PaymentProvider) {
  registry.set(name, provider);
}

export function getProviderNames(): string[] {
  return Array.from(registry.keys());
}


