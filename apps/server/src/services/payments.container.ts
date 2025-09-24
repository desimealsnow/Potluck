import type { PaymentContainer, ProviderConfigStore, Logger, Metrics, IdempotencyStore, WebhookInbox } from '@payments/core';
import { providerRegistry, PaymentService } from '@payments/core';
import { SupabaseConfigStore, supabasePersistence, simpleEventBus, supabaseInbox, supabaseIdempotency } from './payments.adapters';

const logger: Logger = {
  info(msg: string, meta?: unknown) { console.log(msg, meta); },
  warn(msg: string, meta?: unknown) { console.warn(msg, meta); },
  error(msg: string, meta?: unknown) { console.error(msg, meta); }
};

const metrics: Metrics = {
  inc() { /* hook up to prom client here */ },
  observe() { /* hook up to prom client here */ }
};

// Use real adapters where available (Supabase), fallback to simple/in-memory
const configs: ProviderConfigStore = new SupabaseConfigStore();

export function createPaymentContainer(): PaymentContainer {
  const useMemory = process.env.PAYMENTS_USE_MEMORY_ADAPTERS === 'true';
  const memoryInbox = {
    _seen: new Set<string>(),
    async seen(provider: string, eventId: string) { return this._seen.has(`${provider}:${eventId}`); },
    async markProcessed(provider: string, eventId: string) { this._seen.add(`${provider}:${eventId}`); }
  } as const;
  const memoryIdempotency = {
    _keys: new Set<string>(),
    async withKey<T>(key: string, fn: () => Promise<T>) { if (!this._keys.has(key)) this._keys.add(key); return fn(); }
  } as const;
  const container: PaymentContainer & { inbox: WebhookInbox; idempotency: IdempotencyStore } = {
    providers: providerRegistry,
    persistence: supabasePersistence,
    events: simpleEventBus,
    logger,
    metrics,
    configs,
    inbox: useMemory ? (memoryInbox as unknown as WebhookInbox) : supabaseInbox,
    idempotency: useMemory ? (memoryIdempotency as unknown as IdempotencyStore) : supabaseIdempotency,
  };
  return container as unknown as PaymentContainer;
}

export function createPaymentService(): PaymentService {
  return new PaymentService(createPaymentContainer());
}


