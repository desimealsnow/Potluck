import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createWebhookHandler } from '../src/web/express';
import { providerRegistry, registerProvider } from '../src/providers/registry';
import type { PaymentContainer, PaymentProvider, ProviderConfig } from '../src';
import bodyParser from 'body-parser';

const provider: PaymentProvider = {
  async createCheckoutSession() { return { checkoutUrl: '' }; },
  async getSubscription(_cfg, id) { return { id, provider: 'fake', providerSubId: id, planId: 'p', userId: 'u', status: 'active' }; },
  async cancelSubscription() { return { success: true }; },
  verifySignature() { return true; },
  toCanonicalEvents(cfg, raw) {
    const evt = { name: 'subscription.created', provider: 'fake', providerEventId: 'e1', tenantId: cfg.tenantId, occurredAt: new Date().toISOString(), data: {} };
    return [evt];
  }
};
registerProvider('fake', provider);

const container: PaymentContainer = {
  providers: providerRegistry,
  persistence: {
    async upsertPlan() {}, async upsertPrice() {}, async upsertSubscription() {}, async recordInvoice() {}, async recordRefund() {}, async linkUserSubscription() {}
  },
  events: { async publish() {} },
  logger: { info() {}, warn() {}, error() {} },
  configs: { async getConfig(tenantId: string, provider: string): Promise<ProviderConfig | null> { return { provider: 'fake' as any, tenantId, liveMode: false, credentials: {} }; }, async listEnabledProviders() { return []; } },
  inbox: { async seen() { return false; }, async markProcessed() {} },
  idempotency: { async withKey<T>(_k: string, fn: () => Promise<T>) { return fn(); } },
};

describe('Express webhook handler', () => {
  it('accepts webhook and returns 200', async () => {
    const app = express();
    app.post('/billing/webhook/:provider', bodyParser.raw({ type: '*/*' }), createWebhookHandler(container));
    const res = await request(app)
      .post('/billing/webhook/fake?tenantId=t1')
      .set('Content-Type', 'application/json')
      .set('x-signature', 'any')
      .send(Buffer.from(JSON.stringify({ meta: { event_name: 'subscription_created', event_id: 'e1' } })))
      .expect(200);
    expect(res.text).toBe('ok');
  });
});


