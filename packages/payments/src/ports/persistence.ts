import type { Plan, Price, Subscription, Invoice, Refund } from '../types';

export interface BillingPersistencePort {
  upsertPlan(plan: Plan): Promise<void>;
  upsertPrice(price: Price): Promise<void>;
  upsertSubscription(sub: Subscription): Promise<void>;
  recordInvoice(inv: Invoice): Promise<void>;
  recordRefund(ref: Refund): Promise<void>;
  linkUserSubscription(userId: string, subscriptionId: string): Promise<void>;
}

export interface IdempotencyStore {
  withKey<T>(key: string, fn: () => Promise<T>): Promise<T>;
}

export interface WebhookInbox {
  seen(provider: string, eventId: string): Promise<boolean>;
  markProcessed(provider: string, eventId: string): Promise<void>;
}


