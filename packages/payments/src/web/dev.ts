import type { Request, Response, Router as ExpressRouter } from 'express';
import { Router } from 'express';
import { randomUUID } from 'crypto';
import type { PaymentContainer } from '../core/container';
import type { Subscription, Plan } from '../types';

export interface DevRoutesOptions {
  getUserId?: (req: Request) => string | undefined;
  getUserEmail?: (req: Request) => string | undefined;
}

/**
 * Create dev/test-only helper routes backed by the PaymentContainer ports.
 * Host apps can mount under any base path and provide how to read user identity.
 */
export function createDevPaymentsRoutes(container: PaymentContainer, opts?: DevRoutesOptions): ExpressRouter {
  const router = Router();

  router.get('/webhook-status', (_req: Request, res: Response) => {
    res.json({
      status: 'active',
      endpointHint: '/billing/webhook/:provider',
      providers: 'use ProviderConfigStore for enabled providers',
      timestamp: new Date().toISOString(),
    });
  });

  // POST /seed-subscription
  // Body: { provider?: string, plan_id?: string, provider_subscription_id?: string, status?: string, user_id?: string }
  router.post('/seed-subscription', async (req: Request, res: Response) => {
    try {
      const fromOpt = opts?.getUserId?.(req);
      const fromBody = (req.body?.user_id as string | undefined);
      const fromHeader = (Array.isArray(req.headers['x-dev-user-id']) ? req.headers['x-dev-user-id'][0] : (req.headers['x-dev-user-id'] as string | undefined));
      const userId = fromOpt || fromBody || fromHeader;
      const userEmail = opts?.getUserEmail?.(req);
      if (!userId) return res.status(401).json({ ok: false, error: 'Unauthorized: user_id missing' });

      const provider = (req.body?.provider as string) || 'lemonsqueezy';
      let planId = (req.body?.plan_id as string) || 'test-default-plan';
      // Coerce non-UUID plan ids (e.g., provider variant ids like '992415') to a UUID to satisfy DB schemas
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(planId)) {
        const coerced = randomUUID();
        planId = coerced;
        container.logger.info?.('dev.seeding.coercePlanId', { original: req.body?.plan_id, coerced });
      }
      const providerSubId = (req.body?.provider_subscription_id as string) || randomUUID();
      const status = (req.body?.status as Subscription['status']) || 'active';

      // Ensure plan exists (satisfy potential FK)
      const plan: Plan = {
        id: planId,
        name: (req.body?.plan_name as string) || 'Seeded Plan',
        amountCents: Number(req.body?.amount_cents ?? 0),
        currency: (req.body?.currency as string) || 'usd',
        interval: (req.body?.interval as any) || 'month',
        isActive: true,
      } as any;
      try { await container.persistence.upsertPlan(plan); } catch {}

      const sub: Subscription = {
        id: randomUUID(),
        provider,
        providerSubId,
        planId,
        userId,
        status,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await container.persistence.upsertSubscription(sub);
      await container.events.publish('dev.subscription.seeded', { sub, userEmail });

      return res.json({ ok: true, data: sub });
    } catch (e) {
      container.logger.error('dev seed-subscription failed', { error: e });
      return res.status(500).json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' });
    }
  });

  return router;
}


