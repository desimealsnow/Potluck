import type { BillingPersistencePort, DomainEventPublisherPort, WebhookInbox, IdempotencyStore, ProviderConfig, ProviderConfigStore } from '@payments/core';
import type { Plan, Price, Subscription as BillingSub, Invoice, Refund } from '@payments/core';
import { supabase } from '../config/supabaseClient';

export class SupabaseConfigStore implements ProviderConfigStore {
  async getConfig(tenantId: string, provider: string): Promise<ProviderConfig | null> {
    if (provider !== 'lemonsqueezy') return null;
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const signingSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!apiKey) return null;
    return {
      provider: 'lemonsqueezy',
      tenantId,
      liveMode: process.env.LIVE_MODE === 'true',
      credentials: { apiKey, storeId: storeId || '', signingSecret: signingSecret || '' },
      defaultCurrency: 'USD'
    };
  }
  async listEnabledProviders(_tenantId: string): Promise<ProviderConfig[]> { return []; }
}

export const supabasePersistence: BillingPersistencePort = {
  async upsertPlan(plan: Plan) {
    await supabase.from('billing_plans').upsert({
      id: plan.id,
      name: plan.name
    });
  },
  async upsertPrice(price: Price) {
    await supabase.from('billing_prices').upsert({
      id: price.id,
      plan_id: price.planId,
      amount_cents: price.amountCents,
      currency: price.currency,
      interval: price.interval
    });
  },
  async upsertSubscription(sub: BillingSub) {
    await supabase.from('user_subscriptions').upsert({
      id: sub.id,
      provider: sub.provider,
      provider_subscription_id: sub.providerSubId,
      plan_id: sub.planId,
      user_id: sub.userId,
      status: sub.status,
      current_period_end: sub.currentPeriodEnd ?? null
    });
  },
  async recordInvoice(inv: Invoice) {
    await supabase.from('invoices').upsert({
      id: inv.id,
      subscription_id: inv.subscriptionId,
      amount_cents: inv.amountCents,
      currency: inv.currency,
      status: inv.status,
      invoice_date: inv.issuedAt
    });
  },
  async recordRefund(_ref: Refund) {},
  async linkUserSubscription(_userId: string, _subscriptionId: string) {}
};

export const simpleEventBus: DomainEventPublisherPort = {
  async publish(eventName: string, payload: unknown) {
    console.log('[event]', eventName, payload);
  }
};

// Supabase-backed inbox
export const supabaseInbox: WebhookInbox = {
  async seen(provider: string, eventId: string) {
    const { data } = await supabase
      .from('webhook_events')
      .select('processed_at')
      .eq('provider', provider)
      .eq('event_id', eventId)
      .maybeSingle();
    return !!data?.processed_at;
  },
  async markProcessed(provider: string, eventId: string) {
    await supabase.from('webhook_events').upsert({ provider, event_id: eventId, processed_at: new Date().toISOString() });
  }
};

// Supabase-backed idempotency
export const supabaseIdempotency: IdempotencyStore = {
  async withKey<T>(key: string, fn: () => Promise<T>) {
    // Try to insert the key first; rely on unique constraint
    await supabase.from('idempotency_keys').upsert({ key }).select('key');
    return fn();
  }
};


