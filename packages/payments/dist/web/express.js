import crypto from 'crypto';
export function createWebhookHandler(container) {
    return async (req, res) => {
        const started = Date.now();
        const tenantId = req.query.tenantId || req.headers['x-tenant-id'] || 'default';
        const providerName = req.params.provider;
        const log = container.logger;
        if (!tenantId)
            return res.status(400).send('Missing tenantId');
        const cfg = await container.configs.getConfig(tenantId, providerName);
        if (!cfg)
            return res.status(404).send('Config not found');
        const provider = container.providers.get(providerName);
        if (!provider)
            return res.status(404).send('Unknown provider');
        const raw = req.rawBody || (Buffer.isBuffer(req.body) ? req.body : undefined);
        if (!raw)
            return res.status(400).send('Raw body required');
        const signature = req.headers['stripe-signature'] || req.headers['x-signature'] || '';
        if (!provider.verifySignature(cfg, raw, signature)) {
            log.warn('Invalid signature', { tenantId, providerName });
            return res.status(401).send('Invalid signature');
        }
        container.metrics?.inc('payments_webhook_received_total', { provider: providerName });
        await container.events.publish('webhook_received', { provider: providerName, tenantId });
        try {
            const events = provider.toCanonicalEvents(cfg, raw, req.headers);
            for (const ev of events) {
                if (await container.inbox.seen(providerName, ev.providerEventId))
                    continue;
                switch (ev.name) {
                    case 'subscription.created':
                    case 'subscription.updated':
                    case 'subscription.canceled':
                        await container.persistence.upsertSubscription(ev.data);
                        break;
                    case 'invoice.paid':
                        // If invoice lacks subscriptionId, try to enrich by fetching the subscription from LS
                        const inv = ev.data;
                        if (!inv.subscriptionId && providerName === 'lemonsqueezy') {
                            try {
                                const link = inv.subscriptionsLink || '';
                                log.info('Enriching invoice with subscription from LS', { link, orderId: inv.orderId });
                                if (link) {
                                    const res = await fetch(link, { headers: { 'Authorization': `Bearer ${cfg.credentials.apiKey}`, 'Accept': 'application/vnd.api+json' } });
                                    log.info('LS subscriptions fetch response', { status: res.status, ok: res.ok });
                                    if (res.ok) {
                                        const j = await res.json();
                                        log.info('LS subscriptions response body', { dataLength: j?.data?.length || 0, firstItem: j?.data?.[0] ? { id: j.data[0].id, type: j.data[0].type } : null });
                                        const sub = j?.data?.[0];
                                        if (sub) {
                                            const attrs = sub.attributes || {};
                                            // Generate UUID for subscription ID since DB expects UUID format
                                            const subscriptionId = crypto.randomUUID();
                                            // Map LemonSqueezy variant ID to existing billing_plans UUID
                                            const variantId = String(attrs.variant_id || '');
                                            // Get variant mapping from provider config or environment
                                            const variantMapping = cfg.credentials.variantMapping || process.env.LEMONSQUEEZY_VARIANT_MAPPING;
                                            let planId = variantId; // fallback to variant ID if no mapping
                                            if (variantMapping) {
                                                try {
                                                    const variantToPlanMap = JSON.parse(variantMapping);
                                                    planId = variantToPlanMap[variantId] || variantId;
                                                }
                                                catch (e) {
                                                    log.warn('Failed to parse variant mapping, using variant ID as plan ID', { variantId, error: e });
                                                }
                                            }
                                            else {
                                                log.warn('No variant mapping configured, using variant ID as plan ID', { variantId });
                                            }
                                            const canonical = {
                                                id: subscriptionId,
                                                provider: 'lemonsqueezy',
                                                providerSubId: String(sub.id || attrs.id || ''),
                                                planId: planId, // Use mapped plan UUID
                                                userId: String(inv.userId || ''),
                                                status: String(attrs.status || 'active'),
                                                currentPeriodEnd: attrs.current_period_ends_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // Default to 30 days from now if not provided
                                            };
                                            log.info('Upserting enriched subscription', canonical);
                                            await container.persistence.upsertSubscription(canonical);
                                            inv.subscriptionId = canonical.id;
                                            log.info('Updated invoice with subscriptionId', { subscriptionId: inv.subscriptionId });
                                        }
                                    }
                                }
                            }
                            catch (e) {
                                log.warn('Enrichment fetch failed', { error: e.message, link: inv.subscriptionsLink || '' });
                            }
                        }
                        await container.persistence.recordInvoice(inv);
                        break;
                    case 'invoice.payment_failed':
                        break;
                }
                await container.events.publish(ev.name, ev);
                await container.inbox.markProcessed(providerName, ev.providerEventId);
            }
            container.metrics?.observe('payments_webhook_latency_ms', Date.now() - started, { provider: providerName });
            return res.status(200).send('ok');
        }
        catch (error) {
            container.logger.error('Webhook processing failed', { error, providerName, tenantId });
            container.metrics?.inc('payments_webhook_errors_total', { provider: providerName });
            // Acknowledge to avoid retries storms; logged and observable
            return res.status(200).send('ok');
        }
    };
}
//# sourceMappingURL=express.js.map