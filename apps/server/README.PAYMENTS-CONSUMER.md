# Using @payments/core in another repo

1) Install and configure `.npmrc` with your private token (see repo root `.npmrc` example).

2) Initialize container and mount webhook route:

```ts
import express from 'express';
import { raw } from 'body-parser';
import { createWebhookHandler } from '@payments/core';
import { createPaymentContainer } from './src/services/payments.container';

const app = express();
const container = createPaymentContainer();
app.post('/billing/webhook/:provider', raw({ type: '*/*' }), createWebhookHandler(container));
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
```


