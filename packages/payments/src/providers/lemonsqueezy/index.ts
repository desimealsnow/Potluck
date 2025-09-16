import crypto from 'crypto';
import type { PaymentProvider } from '../../ports/provider';
import type { ProviderConfig } from '../../ports/config';
import type { BillingEvent, CheckoutData, Subscription } from '../../types';

const BASE_URL = 'https://api.lemonsqueezy.com/v1';

function parseJson(buffer: Buffer): any {
  try {
    return JSON.parse(buffer.toString('utf-8'));
  } catch (e) {
    return null;
  }
}

export const lemonSqueezyProvider: PaymentProvider = {
  async createCheckoutSession(cfg: ProviderConfig, data: CheckoutData) {
    const apiKey = cfg.credentials.apiKey;
    const storeId = cfg.credentials.storeId || cfg.credentials.storeID || cfg.credentials.store_id || cfg.credentials.STORE_ID || '';
    if (!apiKey) throw new Error('LemonSqueezy apiKey missing in ProviderConfig.credentials');
    if (!storeId) throw new Error('LemonSqueezy storeId missing in ProviderConfig.credentials');

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/json'
    } as const;

    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: data.userEmail,
            name: data.userName || data.userEmail,
            custom: {
              user_id: data.userId,
              plan_id: data.planId,
              tenant_id: data.tenantId,
            }
          },
          product_options: {
            enabled_variants: [data.planId],
            redirect_url: data.successUrl,
          },
        },
        relationships: {
          store: { data: { type: 'stores', id: storeId } },
          variant: { data: { type: 'variants', id: data.planId } }
        }
      }
    };

    const res = await fetch(`${BASE_URL}/checkouts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    } as any);

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LemonSqueezy create checkout failed: ${res.status} ${res.statusText} ${err}`);
    }
    const json: any = await res.json();
    const checkoutUrl = json?.data?.attributes?.url;
    if (!checkoutUrl) throw new Error('LemonSqueezy response missing checkout URL');
    return { checkoutUrl };
  },

  async getSubscription(cfg: ProviderConfig, providerSubId: string): Promise<Subscription> {
    const apiKey = cfg.credentials.apiKey;
    if (!apiKey) throw new Error('LemonSqueezy apiKey missing');
    const res = await fetch(`${BASE_URL}/subscriptions/${providerSubId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json'
      } as any
    } as any);
    if (!res.ok) throw new Error(`LemonSqueezy get subscription failed: ${res.status}`);
    const json: any = await res.json();
    const s = json?.data;
    return {
      id: providerSubId,
      provider: 'lemonsqueezy',
      providerSubId,
      planId: String(s?.attributes?.variant_id || ''),
      userId: String(s?.attributes?.customer_id || ''),
      status: String(s?.attributes?.status || 'active') as any,
      currentPeriodEnd: s?.attributes?.current_period_ends_at || undefined,
    };
  },

  async cancelSubscription(cfg: ProviderConfig, providerSubId: string) {
    const apiKey = cfg.credentials.apiKey;
    if (!apiKey) throw new Error('LemonSqueezy apiKey missing');
    const res = await fetch(`${BASE_URL}/subscriptions/${providerSubId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/vnd.api+json',
        'Content-Type': 'application/json'
      } as any,
      body: JSON.stringify({ data: { type: 'subscriptions', id: providerSubId, attributes: { cancelled: true } } })
    } as any);
    if (!res.ok) throw new Error(`LemonSqueezy cancel failed: ${res.status}`);
    return { success: true };
  },

  verifySignature(cfg: ProviderConfig, rawBody: Buffer, signatureHeader: string): boolean {
    const secret = cfg.credentials.signingSecret || cfg.credentials.webhookSecret || '';
    if (!secret) return true; // allow test mode without secret
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(signatureHeader, 'hex'), Buffer.from(expected, 'hex'));
    } catch {
      return false;
    }
  },

  toCanonicalEvents(cfg: ProviderConfig, rawBody: Buffer, _headers: Record<string,string>): BillingEvent[] {
    const body = parseJson(rawBody);
    if (!body) return [];
    const events: BillingEvent[] = [];
    const eventType = body.meta?.event_name as string | undefined;
    const eventId = body.meta?.event_id as string | undefined;
    const occurredAt = body.meta?.created_at as string | undefined;

    if (!eventType || !eventId) return [];

    // Helper to map LemonSqueezy subscription payload to our canonical Subscription
    function mapSubscriptionPayload(payload: any): any /* Subscription */ {
      const s = payload?.data || payload; // support both body.data and direct
      const attrs = s?.attributes || {};
      return {
        id: String(s?.id || attrs?.id || ''),
        provider: 'lemonsqueezy',
        providerSubId: String(s?.id || attrs?.id || ''),
        planId: String(attrs?.variant_id || ''),
        userId: String(attrs?.customer_id || ''),
        status: String(attrs?.status || 'active'),
        currentPeriodEnd: attrs?.current_period_ends_at || undefined,
      };
    }

    switch (eventType) {
      case 'subscription_created':
        events.push({ name: 'subscription.created', provider: 'lemonsqueezy', providerEventId: eventId, tenantId: cfg.tenantId, occurredAt: occurredAt || new Date().toISOString(), data: mapSubscriptionPayload(body) });
        break;
      case 'subscription_updated':
        events.push({ name: 'subscription.updated', provider: 'lemonsqueezy', providerEventId: eventId, tenantId: cfg.tenantId, occurredAt: occurredAt || new Date().toISOString(), data: mapSubscriptionPayload(body) });
        break;
      case 'subscription_cancelled':
        events.push({ name: 'subscription.canceled', provider: 'lemonsqueezy', providerEventId: eventId, tenantId: cfg.tenantId, occurredAt: occurredAt || new Date().toISOString(), data: mapSubscriptionPayload(body) });
        break;
      case 'order_created':
        // Map to a minimal invoice shape expected by persistence
        const order = body?.data || {};
        const inv = {
          id: String(order?.id || ''),
          subscriptionId: String(order?.attributes?.subscription_id || ''),
          amountCents: Number(order?.attributes?.total || 0),
          currency: String(order?.attributes?.currency || 'USD'),
          status: 'paid',
          issuedAt: occurredAt || new Date().toISOString(),
        };
        events.push({ name: 'invoice.paid', provider: 'lemonsqueezy', providerEventId: eventId, tenantId: cfg.tenantId, occurredAt: inv.issuedAt, data: inv });
        break;
      case 'order_refunded':
        const refund = body?.data || {};
        const invRef = {
          id: String(refund?.id || ''),
          invoiceId: String(refund?.attributes?.order_id || ''),
          amountCents: Number(refund?.attributes?.refund_amount || 0),
          currency: String(refund?.attributes?.currency || 'USD'),
          createdAt: occurredAt || new Date().toISOString(),
        };
        events.push({ name: 'invoice.payment_failed', provider: 'lemonsqueezy', providerEventId: eventId, tenantId: cfg.tenantId, occurredAt: invRef.createdAt, data: invRef });
        break;
      default:
        break;
    }
    return events;
  }
};


