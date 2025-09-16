import type { Request, Response } from 'express';
import type { PaymentContainer } from '../core/container';

export function createWebhookHandler(container: PaymentContainer) {
  return async (req: Request, res: Response) => {
    const started = Date.now();
    const tenantId = (req.query.tenantId as string) || (req.headers['x-tenant-id'] as string) || 'default';
    const providerName = (req.params as any).provider as string;
    const log = container.logger;

    if (!tenantId) return res.status(400).send('Missing tenantId');
    const cfg = await container.configs.getConfig(tenantId, providerName);
    if (!cfg) return res.status(404).send('Config not found');

    const provider = container.providers.get(providerName);
    if (!provider) return res.status(404).send('Unknown provider');

    const raw: Buffer | undefined = (req as any).rawBody || (Buffer.isBuffer((req as any).body) ? (req as any).body : undefined);
    if (!raw) return res.status(400).send('Raw body required');

    const signature = (req.headers['stripe-signature'] as string) || (req.headers['x-signature'] as string) || '';
    if (!provider.verifySignature(cfg, raw, signature)) {
      log.warn('Invalid signature', { tenantId, providerName });
      return res.status(401).send('Invalid signature');
    }

    container.metrics?.inc('payments_webhook_received_total', { provider: providerName });
    await container.events.publish('webhook_received', { provider: providerName, tenantId });

    try {
      const events = provider.toCanonicalEvents(cfg, raw, req.headers as any);

      for (const ev of events) {
        if (await container.inbox.seen(providerName, ev.providerEventId)) continue;

        switch (ev.name) {
          case 'subscription.created':
          case 'subscription.updated':
          case 'subscription.canceled':
            await container.persistence.upsertSubscription(ev.data as any);
            break;
          case 'invoice.paid':
            await container.persistence.recordInvoice(ev.data as any);
            break;
          case 'invoice.payment_failed':
            break;
        }

        await container.events.publish(ev.name, ev);
        await container.inbox.markProcessed(providerName, ev.providerEventId);
      }

      container.metrics?.observe('payments_webhook_latency_ms', Date.now() - started, { provider: providerName });
      return res.status(200).send('ok');
    } catch (error) {
      container.logger.error('Webhook processing failed', { error, providerName, tenantId });
      container.metrics?.inc('payments_webhook_errors_total', { provider: providerName });
      // Acknowledge to avoid retries storms; logged and observable
      return res.status(200).send('ok');
    }
  };
}


