import { describe, it, expect } from 'vitest';
import { PaymentService } from '../src/app/paymentService';
import { providerRegistry, registerProvider } from '../src/providers/registry';
import type { PaymentContainer, PaymentProvider, ProviderConfig } from '../src';

const fakeProvider: PaymentProvider = {
  async createCheckoutSession(_cfg, data) { return { checkoutUrl: `https://example.test/checkout?plan=${data.planId}` }; },
  async getSubscription(_cfg, id) { return { id, provider: 'fake', providerSubId: id, planId: 'p', userId: 'u', status: 'active' }; },
  async cancelSubscription() { return { success: true }; },
  verifySignature() { return true; },
  toCanonicalEvents(cfg, raw) { return []; }
};

registerProvider('fake', fakeProvider);

const container: PaymentContainer = {
  providers: providerRegistry,
  persistence: {
    async upsertPlan() {},
    async upsertPrice() {},
    async upsertSubscription() {},
    async recordInvoice() {},
    async recordRefund() {},
    async linkUserSubscription() {},
  },
  events: { async publish() {} },
  logger: { info() {}, warn() {}, error() {} },
  configs: {
    async getConfig(tenantId: string, provider: string): Promise<ProviderConfig | null> {
      return { provider: 'fake' as any, tenantId, liveMode: false, credentials: {} };
    },
    async listEnabledProviders() { return []; }
  },
  inbox: { async seen() { return false; }, async markProcessed() {} },
  idempotency: { async withKey<T>(_k: string, fn: () => Promise<T>) { return fn(); } },
};

describe('PaymentService', () => {
  it('creates checkout sessions', async () => {
    const svc = new PaymentService(container);
    const res = await svc.createCheckout({ tenantId: 't1', planId: 'plan-1', userId: 'u1', userEmail: 'u1@test.dev', provider: 'fake' });
    expect(res.checkoutUrl).toContain('plan-1');
  });
});


