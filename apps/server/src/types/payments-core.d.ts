declare module '@payments/core' {
  export type Logger = { info: (msg: string, meta?: unknown) => void; warn: (msg: string, meta?: unknown) => void; error: (msg: string, meta?: unknown) => void };
  export type Metrics = { inc: (name: string, labels?: Record<string, string>) => void; observe: (name: string, value: number, labels?: Record<string, string>) => void };
  export type ProviderConfig = { provider: string; tenantId: string; liveMode: boolean; credentials: Record<string, unknown>; defaultCurrency: string };
  export interface ProviderConfigStore { getConfig(tenantId: string, provider: string): Promise<ProviderConfig | null>; listEnabledProviders(tenantId: string): Promise<ProviderConfig[]>; }
  export type Plan = { id: string; name: string };
  export type Price = { id: string; planId: string; amountCents: number; currency: string; interval: string };
  export type Subscription = { id: string; provider: string; providerSubId: string; planId: string; userId: string; status: string; currentPeriodEnd?: string };
  export type Invoice = { id: string; subscriptionId?: string | null; amountCents: number; currency: string; status: string; issuedAt: string };
  export type Refund = { id: string };
  export interface BillingPersistencePort {
    upsertPlan(plan: Plan): Promise<void>;
    upsertPrice(price: Price): Promise<void>;
    upsertSubscription(sub: Subscription): Promise<void>;
    recordInvoice(inv: Invoice): Promise<void>;
    recordRefund(ref: Refund): Promise<void>;
    linkUserSubscription(userId: string, subscriptionId: string): Promise<void>;
  }
  export interface DomainEventPublisherPort { publish(eventName: string, payload: unknown): Promise<void>; }
  export interface WebhookInbox { seen(provider: string, eventId: string): Promise<boolean>; markProcessed(provider: string, eventId: string): Promise<void>; }
  export interface IdempotencyStore { withKey<T>(key: string, fn: () => Promise<T>): Promise<T>; }
  export const providerRegistry: Record<string, unknown>;
  export interface PaymentContainer {
    providers: Record<string, unknown>;
    persistence: BillingPersistencePort;
    events: DomainEventPublisherPort;
    logger: Logger;
    metrics?: Metrics;
    configs: ProviderConfigStore;
    inbox: WebhookInbox;
    idempotency: IdempotencyStore;
  }
  export function createWebhookHandler(container?: PaymentContainer): unknown;
  export function getProviderNames(): string[];
  export class PaymentService { 
    constructor(container: PaymentContainer);
    createCheckout(data: CheckoutData & { provider?: string }): Promise<{ checkoutUrl: string; providerSessionId?: string }>;
  }
}


