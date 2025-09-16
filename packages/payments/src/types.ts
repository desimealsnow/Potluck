export type SubscriptionStatus =
  | 'trialing' | 'active' | 'past_due' | 'paused'
  | 'canceled' | 'incomplete' | 'incomplete_expired';

export interface Plan { id: string; name: string; }
export interface Price { id: string; planId: string; amountCents: number; currency: string; interval: 'month' | 'year'; }

export interface Subscription { id: string; provider: string; providerSubId: string; planId: string; userId: string; status: SubscriptionStatus; currentPeriodEnd?: string; }

export interface Invoice { id: string; subscriptionId: string; amountCents: number; currency: string; status: 'paid' | 'failed' | 'open'; issuedAt: string; }
export interface Refund { id: string; invoiceId: string; amountCents: number; currency: string; createdAt: string; }

export interface CheckoutData {
  tenantId: string;
  planId: string;
  priceId?: string;
  userId: string;
  userEmail: string;
  userName?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface BillingEvent<T = unknown> {
  name: 'subscription.created' | 'subscription.updated' | 'subscription.canceled' | 'invoice.paid' | 'invoice.payment_failed' | string;
  provider: string;
  providerEventId: string;
  tenantId: string;
  occurredAt: string;
  data: T;
}


