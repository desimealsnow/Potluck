import type { BillingPersistencePort, DomainEventPublisherPort, WebhookInbox, IdempotencyStore, ProviderConfig, ProviderConfigStore } from '@payments/core';
import type { Plan, Price, Subscription as BillingSub, Invoice, Refund } from '@payments/core';
import { supabase } from '../config/supabaseClient';

export class SupabaseConfigStore implements ProviderConfigStore {
  async getConfig(tenantId: string, provider: string): Promise<ProviderConfig | null> {
    // Map 'stripe' provider to 'lemonsqueezy' for LemonSqueezy integration
    if (provider !== 'lemonsqueezy' && provider !== 'stripe') return null;
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const signingSecret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    if (!apiKey) return null;

    // Fetch variant mapping from database
    let variantMapping = '';
    try {
      const { data: plans } = await supabase
        .from('billing_plans')
        .select('id, external_id')
        .eq('provider', 'lemonsqueezy')
        .not('external_id', 'is', null);
      
      if (plans && plans.length > 0) {
        const mapping: Record<string, string> = {};
        plans.forEach(plan => {
          if (plan.external_id) {
            mapping[plan.external_id] = plan.id;
          }
        });
        variantMapping = JSON.stringify(mapping);
      }
    } catch (error) {
      console.warn('Failed to fetch variant mapping from database:', error);
    }

    return {
      provider: 'lemonsqueezy',
      tenantId,
      liveMode: process.env.LIVE_MODE === 'true',
      credentials: { 
        apiKey, 
        storeId: storeId || '', 
        signingSecret: signingSecret || '',
        variantMapping
      },
      defaultCurrency: 'USD'
    };
  }
  async listEnabledProviders(_tenantId: string): Promise<ProviderConfig[]> {
    void _tenantId;
    return [];
  }
}

export const supabasePersistence: BillingPersistencePort = {
  async upsertPlan(plan: Plan) {
    const { error } = await supabase.from('billing_plans').upsert({
      id: plan.id,
      name: plan.name,
      amount_cents: (plan as any).amountCents ?? (plan as any).amount_cents ?? 0,
      currency: (plan as any).currency ?? 'usd',
      interval: (plan as any).interval ?? 'month',
      is_active: (plan as any).is_active ?? true
    });
    if (error) {
      console.error('[payments.persistence] upsertPlan failed', error);
      throw error;
    }
  },
  async upsertPrice(price: Price) {
    const { error } = await supabase.from('billing_prices').upsert({
      id: price.id,
      plan_id: price.planId,
      amount_cents: price.amountCents,
      currency: price.currency,
      interval: price.interval
    });
    if (error) {
      console.error('[payments.persistence] upsertPrice failed', error);
      throw error;
    }
  },
  async upsertSubscription(sub: BillingSub) {
    const nowIso = new Date().toISOString();
    type SubLike = { currentPeriodStart?: string; startDate?: string };
    const subLike = sub as unknown as SubLike;
    const start = subLike.currentPeriodStart || subLike.startDate || nowIso;
    const payload = {
      id: sub.id,
      provider: sub.provider,
      provider_subscription_id: sub.providerSubId,
      plan_id: sub.planId,
      user_id: sub.userId,
      status: sub.status,
      start_date: start,
      current_period_end: sub.currentPeriodEnd || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // Default to 30 days from now if not provided
    };
    console.log('[payments.persistence] upsertSubscription payload', payload);
    const { data, error } = await supabase
      .from('user_subscriptions')
      .upsert(payload)
      .select('id,user_id,plan_id,status,start_date,current_period_end');
    if (data && Array.isArray(data)) {
      console.log('[payments.persistence] upsertSubscription rows', data);
    }
    if (error) {
      console.error('[payments.persistence] upsertSubscription failed', error, { sub });
      throw error;
    }
  },
  async recordInvoice(inv: Invoice) {
    const userId = (inv as any).userId as string | undefined;
    const provider = ((inv as any).provider as string | undefined) ?? 'lemonsqueezy';
    const payload = {
      id: inv.id,
      subscription_id: inv.subscriptionId ?? null,
      user_id: userId,
      amount_cents: inv.amountCents,
      currency: inv.currency,
      status: inv.status,
      invoice_date: inv.issuedAt,
      provider,
    } as any;
    if (!payload.user_id) {
      console.warn('[payments.persistence] recordInvoice missing user_id; invoice payload', payload);
    }
    const { error } = await supabase.from('invoices').upsert(payload);
    if (error) {
      console.error('[payments.persistence] recordInvoice failed', error);
      throw error;
    }
  },
  async recordRefund(_ref: Refund) { void _ref; },
  async linkUserSubscription(_userId: string, _subscriptionId: string) { void _userId; void _subscriptionId; }
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


