# @payments/core

A framework- and provider-agnostic payments module with explicit ports, a provider registry, idempotent webhook handling, and tiny server adapters. Built to be plugged into multiple repos.

## What this package provides
- Core types and ports (DI-friendly): logger, metrics, config, persistence, events, idempotency, webhook inbox, provider.
- Provider registry with a LemonSqueezy provider and an extension point for more.
- Webhook middleware for Express (Fastify adapter pattern ready).
- High-level `PaymentService` (checkout orchestration with idempotency).

## Install (private registry examples)

GitHub Packages:
```
@payments:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GH_PACKAGES_TOKEN}
```
Then in your app:
```
npm i @payments/core
```

Private npm scope (npmjs):
```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
@payments:registry=https://registry.npmjs.org/
```

## Core concepts

Ports (you implement these in your app):
- Logger, Metrics
- ProviderConfigStore (per-tenant provider creds)
- BillingPersistencePort (plans, prices, subscriptions, invoices, refunds)
- DomainEventPublisherPort (emit domain events)
- IdempotencyStore (ensure once-only for commands)
- WebhookInbox (dedupe incoming events)

Providers (implemented in the package):
- `lemonsqueezy` (baseline). You can register more via `registerProvider(name, provider)`.

### Types
```ts
import type { CheckoutData, Subscription, BillingEvent, Plan, Price, Invoice, Refund } from '@payments/core';
```

## Quick start (Express)

1) Create adapters in your app (DB, events, etc.) implementing the ports. See example in this repo: `apps/server/src/services/payments.adapters.ts`.

2) Create a container factory wiring ports and registry:
```ts
import { providerRegistry, type PaymentContainer, PaymentService } from '@payments/core';
// import your adapters here

export function createPaymentContainer(): PaymentContainer {
  return {
    providers: providerRegistry,
    persistence: yourPersistence,
    events: yourEventBus,
    logger: yourLogger,
    metrics: yourMetrics,
    configs: yourConfigStore,
    inbox: yourWebhookInbox,
    idempotency: yourIdempotencyStore,
  };
}

export function createPaymentService(): PaymentService {
  return new PaymentService(createPaymentContainer());
}
```

3) Mount webhook route with raw body:
```ts
import { raw } from 'body-parser';
import { createWebhookHandler } from '@payments/core';
import { createPaymentContainer } from './payments.container';

const container = createPaymentContainer();
app.post('/billing/webhook/:provider', raw({ type: '*/*' }), createWebhookHandler(container));
```

4) Initiate checkout in your controller:
```ts
import { createPaymentService } from './payments.container';

const service = createPaymentService();
const session = await service.createCheckout({
  tenantId: 'default',
  planId: variantId,
  userId,
  userEmail,
  provider: 'lemonsqueezy'
});
return res.json({ checkout_url: session.checkoutUrl });
```

## Webhook handling
- Requires raw body to verify signatures.
- Multi-tenant: read `tenantId` from `x-tenant-id` header or `?tenantId` query.
- Dedupe via `WebhookInbox`.
- Maps provider payloads to canonical events; persists facts and publishes domain events.

## Idempotency and webhook inbox: storage options
Choose one per app; no extra DB is required if you prefer cache.
- In-memory: simplest, single-instance only.
- Redis: recommended for distributed idempotency (use `SET key NX PX <ttl>`).
- App DB: durable; create two small tables (see SQL below) in your app’s existing schema.

### SQL (Postgres/Supabase)
```sql
create table if not exists webhook_events (
  provider text not null,
  event_id text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint webhook_events_pk primary key (provider, event_id)
);

create table if not exists idempotency_keys (
  key text primary key,
  result_hash text,
  created_at timestamptz not null default now()
);
```

## Provider config
Implement `ProviderConfigStore` to supply per-tenant credentials from env or DB. Example shape:
```ts
{ provider: 'lemonsqueezy', tenantId, liveMode: false, credentials: { apiKey, signingSecret }, defaultCurrency: 'USD' }
```

## Extending providers
Register new providers at boot:
```ts
import { registerProvider } from '@payments/core';
registerProvider('stripe', stripeProviderImpl);
```

## Publishing
Monorepo scripts (example):
```
npm version patch -w packages/payments
npm publish -w packages/payments --access restricted
```

## FAQ
- DB required? No. Use in-memory or Redis adapters if you don’t want DB tables.
- Multi-tenant? Yes; pass `tenantId` and implement `ProviderConfigStore`.
- Frontend SDK? Keep thin: call your server to create checkout, open hosted URL.


