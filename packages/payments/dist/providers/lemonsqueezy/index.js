import crypto from 'crypto';
const BASE_URL = 'https://api.lemonsqueezy.com/v1';
function parseJson(buffer) {
    try {
        return JSON.parse(buffer.toString('utf-8'));
    }
    catch (e) {
        return null;
    }
}
export const lemonSqueezyProvider = {
    async createCheckoutSession(cfg, data) {
        const apiKey = cfg.credentials.apiKey;
        const storeId = cfg.credentials.storeId || cfg.credentials.storeID || cfg.credentials.store_id || cfg.credentials.STORE_ID || '';
        if (!apiKey)
            throw new Error('LemonSqueezy apiKey missing in ProviderConfig.credentials');
        if (!storeId)
            throw new Error('LemonSqueezy storeId missing in ProviderConfig.credentials');
        const headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Accept': 'application/vnd.api+json',
            'Content-Type': 'application/json'
        };
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
                    product_options: Object.assign({ enabled_variants: [data.planId] }, data.successUrl ? { redirect_url: data.successUrl } : {}),
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
        });
        if (!res.ok) {
            const err = await res.text();
            throw new Error(`LemonSqueezy create checkout failed: ${res.status} ${res.statusText} ${err}`);
        }
        const json = await res.json();
        const checkoutUrl = json?.data?.attributes?.url;
        if (!checkoutUrl)
            throw new Error('LemonSqueezy response missing checkout URL');
        return { checkoutUrl };
    },
    async getSubscription(cfg, providerSubId) {
        const apiKey = cfg.credentials.apiKey;
        if (!apiKey)
            throw new Error('LemonSqueezy apiKey missing');
        const res = await fetch(`${BASE_URL}/subscriptions/${providerSubId}`, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/vnd.api+json'
            }
        });
        if (!res.ok)
            throw new Error(`LemonSqueezy get subscription failed: ${res.status}`);
        const json = await res.json();
        const s = json?.data;
        return {
            id: providerSubId,
            provider: 'lemonsqueezy',
            providerSubId,
            planId: String(s?.attributes?.variant_id || ''),
            userId: String(s?.attributes?.customer_id || ''),
            status: String(s?.attributes?.status || 'active'),
            currentPeriodEnd: s?.attributes?.current_period_ends_at || undefined,
        };
    },
    async cancelSubscription(cfg, providerSubId) {
        const apiKey = cfg.credentials.apiKey;
        if (!apiKey)
            throw new Error('LemonSqueezy apiKey missing');
        const res = await fetch(`${BASE_URL}/subscriptions/${providerSubId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/vnd.api+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ data: { type: 'subscriptions', id: providerSubId, attributes: { cancelled: true } } })
        });
        if (!res.ok)
            throw new Error(`LemonSqueezy cancel failed: ${res.status}`);
        return { success: true };
    },
    verifySignature(cfg, rawBody, signatureHeader) {
        const secret = cfg.credentials.signingSecret || cfg.credentials.webhookSecret || '';
        if (!secret)
            return true; // allow test mode without secret
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        try {
            return crypto.timingSafeEqual(Buffer.from(signatureHeader, 'hex'), Buffer.from(expected, 'hex'));
        }
        catch {
            return false;
        }
    },
    toCanonicalEvents(cfg, rawBody, _headers) {
        const body = parseJson(rawBody);
        if (!body)
            return [];
        const events = [];
        const eventType = body.meta?.event_name;
        // LemonSqueezy uses webhook_id, not event_id
        const eventId = (body.meta?.event_id || body.meta?.webhook_id);
        const occurredAt = (body.meta?.created_at || body.data?.attributes?.created_at);
        if (!eventType || !eventId)
            return [];
        // Helper to map LemonSqueezy subscription payload to our canonical Subscription
        function mapSubscriptionPayload(payload) {
            const s = payload?.data || payload; // support both body.data and direct
            const attrs = s?.attributes || {};
            const customUserId = body?.meta?.custom_data?.user_id;
            // Map LemonSqueezy variant ID to existing billing_plans UUID
            const variantId = String(attrs?.variant_id || '');
            // Get variant mapping from provider config or environment
            const variantMapping = cfg.credentials.variantMapping || process.env.LEMONSQUEEZY_VARIANT_MAPPING;
            let planId = variantId; // fallback to variant ID if no mapping
            if (variantMapping) {
                try {
                    const variantToPlanMap = JSON.parse(variantMapping);
                    planId = variantToPlanMap[variantId] || variantId;
                }
                catch (e) {
                    // Silent fallback - this is called during event processing
                    planId = variantId;
                }
            }
            return {
                id: crypto.randomUUID(), // Generate UUID for subscription ID since DB expects UUID format
                provider: 'lemonsqueezy',
                providerSubId: String(s?.id || attrs?.id || ''),
                planId: planId, // Use mapped plan UUID
                // Prefer our app user id passed via checkout custom_data
                userId: String(customUserId || attrs?.customer_id || ''),
                status: String(attrs?.status || 'active'),
                currentPeriodEnd: attrs?.current_period_ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default to 30 days from now if not provided
            };
        }
        const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
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
                const orderAttrs = order?.attributes || {};
                // Use LemonSqueezy order identifier (UUID) as our invoice id to satisfy DB UUID requirement
                const inv = {
                    id: String(orderAttrs?.identifier || order?.id || ''),
                    // Only set subscriptionId if it's a UUID, otherwise leave undefined/null
                    subscriptionId: isUuid(orderAttrs?.subscription_id) ? String(orderAttrs?.subscription_id) : undefined,
                    amountCents: Number(order?.attributes?.total || 0),
                    currency: String(order?.attributes?.currency || 'USD'),
                    status: 'paid',
                    issuedAt: occurredAt || new Date().toISOString(),
                    // Carry through app user and provider for persistence needs
                    userId: body?.meta?.custom_data?.user_id ? String(body.meta.custom_data.user_id) : undefined,
                    provider: 'lemonsqueezy',
                    // Enrichment hints for handler
                    orderId: String(order?.id || ''),
                    subscriptionsLink: String(order?.relationships?.subscriptions?.links?.related || ''),
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
//# sourceMappingURL=index.js.map