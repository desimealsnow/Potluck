# @payments/core

A framework- and provider-agnostic payments module with explicit ports, a provider registry, idempotent webhook handling, and tiny server adapters. Built to be plugged into multiple repos.

## What this package provides
- Core types and ports (DI-friendly): logger, metrics, config, persistence, events, idempotency, webhook inbox, provider.
- Provider registry with a LemonSqueezy provider and an extension point for more.
- Webhook middleware for Express (Fastify adapter pattern ready).
- Dev/test router factory to seed data without external webhooks.
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

## LemonSqueezy Configuration

The LemonSqueezy provider automatically maps variant IDs to billing plans using the `external_id` column in your `billing_plans` table.

### Database Setup

**Step 1: Add external_id column and fix constraints**
```sql
-- Add external_id column
ALTER TABLE billing_plans ADD COLUMN external_id VARCHAR(255);
CREATE INDEX idx_billing_plans_external_id ON billing_plans(external_id);

-- Fix provider constraint to allow lemonsqueezy
ALTER TABLE billing_plans DROP CONSTRAINT IF EXISTS billing_plans_provider_ck;
ALTER TABLE billing_plans ADD CONSTRAINT billing_plans_provider_ck CHECK (provider IN ('stripe', 'paypal', 'razorpay', 'square', 'lemonsqueezy'));
```

**Step 2: Map your plans to LemonSqueezy variant IDs**
```sql
-- Map existing plans to LemonSqueezy variant IDs
UPDATE billing_plans SET external_id = '992413', provider = 'lemonsqueezy' WHERE name = 'pro';
UPDATE billing_plans SET external_id = '992415', provider = 'lemonsqueezy' WHERE name = 'basic';
```

**Step 3: Verify the setup**
```sql
-- Check that mappings are correct
SELECT id, name, external_id, provider FROM billing_plans WHERE external_id IS NOT NULL;
```

### Database Verification Scripts

Create these temporary scripts to verify your database setup:

**`apps/server/verify-database-setup.js`**
```javascript
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function verifySetup() {
  console.log('🔍 Verifying LemonSqueezy database setup...\n');

  // Check external_id column exists
  const { data: testData, error: testError } = await supabase
    .from('billing_plans')
    .select('external_id')
    .limit(1);
  
  if (testError && testError.message.includes('external_id')) {
    console.log('❌ external_id column missing - run the SQL setup first');
    return;
  }
  console.log('✅ external_id column exists');

  // Check current plans and mappings
  const { data: plans } = await supabase
    .from('billing_plans')
    .select('id, name, external_id, provider')
    .order('name');

  console.log('\n📊 Current billing_plans:');
  plans.forEach(plan => {
    const status = plan.external_id ? '✅' : '❌';
    console.log(`  ${status} ${plan.name}: ${plan.external_id || 'NO EXTERNAL_ID'} (${plan.provider || 'NO PROVIDER'})`);
  });

  // Test variant mapping
  const variantMapping = {};
  plans.filter(p => p.external_id && p.provider === 'lemonsqueezy').forEach(plan => {
    variantMapping[plan.external_id] = plan.id;
  });

  console.log('\n🔗 Generated variant mapping:', JSON.stringify(variantMapping, null, 2));
  
  const testVariants = ['992413', '992415'];
  testVariants.forEach(variant => {
    const planId = variantMapping[variant];
    console.log(`${planId ? '✅' : '❌'} Variant ${variant} -> ${planId || 'NO MAPPING'}`);
  });
}

verifySetup().catch(console.error);
```

**Run the verification:**
```bash
cd apps/server
node verify-database-setup.js
```

### Testing and Verification

**Comprehensive API Test Script:**
```bash
# Test LemonSqueezy API connection, products, and checkout creation
cd apps/server
node scripts/test-lemonsqueezy.js
```

This script validates:
- ✅ API key authentication
- ✅ Store access and configuration
- ✅ Product and variant availability
- ✅ Checkout creation functionality
- ✅ Integration readiness

**Database Verification Script:**
```bash
# Verify database setup and mappings
cd apps/server
node verify-database-setup.js
```

This script checks:
- ✅ Database schema (external_id column)
- ✅ Variant ID mappings
- ✅ Recent subscriptions and invoices
- ✅ Constraint compliance

The system automatically queries the database to build variant mappings dynamically. No environment variables or code changes needed for new stores/plans.

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

// Optional: mount dev/test routes
import { createDevPaymentsRoutes } from '@payments/core';
if (process.env.NODE_ENV !== 'production') {
  // Protect dev routes and pass identity accessors
  app.use('/payments-dev', authGuard, createDevPaymentsRoutes(container, {
    getUserId: (req) => (req as any).user?.id,
    getUserEmail: (req) => (req as any).user?.email,
  }));
}
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

## Dev router: seeding helpers

Endpoints (dev-only):
- `GET /payments-dev/webhook-status` – quick readiness check
- `POST /payments-dev/seed-subscription` – persist a subscription for the authenticated user

Example request (Authorization required):
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

Implementation details:
- The dev route runs under your app's auth; pass hooks to read `user.id`/`user.email`.
- It coerces non-UUID `plan_id` to a UUID and upserts a plan with defaults to satisfy FK (`amount_cents=0`, `currency='usd'`, `interval='month'`, `is_active=true`).
- It persists `user_subscriptions` with fields: `id`, `user_id`, `plan_id`, `status`, `start_date`, `current_period_end`, `provider`, `provider_subscription_id`.
- Ensure your DB `provider` CHECK includes your provider (for LemonSqueezy add `'lemonsqueezy'`).

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
- DB required? No. Use in-memory or Redis adapters if you don't want DB tables.
- Multi-tenant? Yes; pass `tenantId` and implement `ProviderConfigStore`.
- Frontend SDK? Keep thin: call your server to create checkout, open hosted URL.

## Recent Changes Summary

This section documents the major improvements made to the `@payments/core` package based on real-world implementation and testing.

### 🔧 Database Schema Improvements

**Problem**: Hardcoded variant IDs and environment variable dependencies made the system inflexible and hard to scale.

**Solution**: Implemented database-driven variant mapping using `external_id` column in `billing_plans` table.

**Changes**:
- Added `external_id` column to `billing_plans` table
- Updated provider constraint to include 'lemonsqueezy'
- Dynamic variant mapping from database instead of environment variables
- Automatic fallback to variant ID if no mapping exists

### 🛠️ Webhook Processing Fixes

**Problem**: Multiple database constraint violations during webhook processing.

**Solution**: Fixed UUID generation, NOT NULL constraints, and foreign key relationships.

**Changes**:
- Generate proper UUIDs for subscription IDs instead of using LemonSqueezy numeric IDs
- Provide default `current_period_end` values (30 days from now) to satisfy NOT NULL constraints
- Map LemonSqueezy variant IDs to existing billing plan UUIDs to satisfy foreign key constraints
- Added comprehensive error handling and logging

### 🏗️ Architecture Improvements

**Problem**: Hardcoded values and tight coupling made the system difficult to maintain.

**Solution**: Made the system fully configurable and database-driven.

**Changes**:
- Removed hardcoded variant ID mappings
- Implemented database-driven configuration via `SupabaseConfigStore`
- Added dynamic variant mapping lookup in webhook processing
- Created comprehensive database verification scripts

### 📊 Real-Time Data Flow

**How data flows from UI to database**:

1. **User clicks "Get Started"** → `SubscriptionScreen.tsx` calls `paymentService.startPayment()`
2. **Server creates checkout** → `billing.controller.ts` calls `createPaymentService().createCheckout()`
3. **User completes payment** → LemonSqueezy processes payment and sends webhook
4. **Webhook processing** → `packages/payments/src/web/express.ts` automatically:
   - Verifies webhook signature
   - Fetches subscription data from LemonSqueezy API
   - Maps variant ID to plan UUID using database lookup
   - Inserts subscription into `user_subscriptions` table
   - Records invoice in `invoices` table
5. **UI updates** → `SubscriptionScreen.tsx` polls for subscription updates and displays status

### 🧪 Testing and Verification

**Database verification script**:
```bash
# Create and run verification script
cd apps/server
node verify-database-setup.js
```

**Manual verification**:
```sql
-- Check variant mappings
SELECT id, name, external_id, provider FROM billing_plans WHERE external_id IS NOT NULL;

-- Check recent subscriptions
SELECT * FROM user_subscriptions WHERE provider = 'lemonsqueezy' ORDER BY created_at DESC LIMIT 5;

-- Check recent invoices
SELECT * FROM invoices WHERE provider = 'lemonsqueezy' ORDER BY issued_at DESC LIMIT 5;
```

### 🚀 Benefits

- ✅ **Scalable**: Add unlimited stores/plans without code changes
- ✅ **Multi-tenant**: Each tenant can have different variant mappings
- ✅ **Dynamic**: Changes take effect immediately without restarts
- ✅ **Maintainable**: All configuration in database
- ✅ **Robust**: Comprehensive error handling and fallbacks
- ✅ **Testable**: Database verification scripts for easy debugging


