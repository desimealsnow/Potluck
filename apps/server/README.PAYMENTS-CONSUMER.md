# Using @payments/core in another repo

1) Install and configure `.npmrc` with your private token (see repo root `.npmrc` example).

2) Initialize container and mount webhook route:

```ts
import express from 'express';
import { raw } from 'body-parser';
import { createWebhookHandler, createDevPaymentsRoutes } from '@payments/core';
import { createPaymentContainer } from './src/services/payments.container';

const app = express();
const container = createPaymentContainer();
app.post('/billing/webhook/:provider', raw({ type: '*/*' }), createWebhookHandler(container));

// Dev/test-only helper routes (seed subscription, webhook status)
if (process.env.NODE_ENV !== 'production') {
  // Protect dev routes so they run under the authenticated user context
  app.use('/payments-dev', authGuard, createDevPaymentsRoutes(container, {
    getUserId: (req) => req.user?.id,
    getUserEmail: (req) => req.user?.email,
  }));
}
```

3) Use `PaymentService` for checkout:

```ts
import { createPaymentService } from './src/services/payments.container';
const payments = createPaymentService();
const session = await payments.createCheckout({ tenantId: 'default', planId: 'variantId', userId, userEmail });

4) Storage choices for idempotency and inbox
- In-memory (single instance) or Redis (distributed) or DB tables.
- If DB, run these SQLs in your app DB:
```
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

5) Dev/test seeding without external webhooks

Use the dev router to create a subscription deterministically during UI tests (requires auth header):

```http
POST /payments-dev/seed-subscription
Authorization: Bearer <supabase_jwt>
Content-Type: application/json

{
  "provider": "lemonsqueezy",
  "plan_id": "992415",
  "status": "active"
}
```

Notes:
- The dev route will coerce non-UUID `plan_id` values (e.g., LemonSqueezy variant ids like `992415`) to a generated UUID for DB compatibility, and upsert a `billing_plans` row with sensible defaults (amount_cents=0, currency=usd, interval=month, is_active=true) to satisfy FK.
- It persists `user_subscriptions` with fields: `id`, `user_id`, `plan_id`, `status`, `start_date`, `current_period_end`, `provider`, `provider_subscription_id`. Columns like `cancel_at_period_end`, `created_at`, `updated_at` rely on defaults.
- Ensure your schema allows the `provider` you use. For LemonSqueezy, add it to the CHECK constraint:

```sql
ALTER TABLE public.user_subscriptions
  DROP CONSTRAINT IF EXISTS user_subscriptions_provider_ck;

ALTER TABLE public.user_subscriptions
  ADD CONSTRAINT user_subscriptions_provider_ck
  CHECK (provider = ANY (ARRAY['stripe','paypal','razorpay','square','lemonsqueezy']));
```
```


