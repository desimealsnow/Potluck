import { describe, it, expect, vi, beforeEach } from 'vitest';
import { lemonSqueezyProvider } from '../src/providers/lemonsqueezy';

const cfg = {
  provider: 'lemonsqueezy',
  tenantId: 't1',
  liveMode: false,
  credentials: { apiKey: 'sk_test_x', storeId: 'store_1', signingSecret: 'sec' }
} as const;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('LemonSqueezy provider', () => {
  it('creates checkout via API', async () => {
    const fetchMock = vi.spyOn(global, 'fetch' as any).mockResolvedValueOnce({ ok: true, json: async () => ({ data: { attributes: { url: 'https://checkout/url' } } }) });
    const res = await lemonSqueezyProvider.createCheckoutSession(cfg as any, { tenantId: 't1', planId: 'v_1', userId: 'u1', userEmail: 'u@test.dev' });
    expect(res.checkoutUrl).toContain('checkout');
    expect(fetchMock).toHaveBeenCalled();
  });

  it('verifies signature (HMAC-SHA256 hex)', () => {
    const body = Buffer.from('{"a":1}');
    const crypto = require('crypto');
    const sig = crypto.createHmac('sha256', cfg.credentials.signingSecret).update(body).digest('hex');
    const ok = lemonSqueezyProvider.verifySignature(cfg as any, body, sig);
    expect(ok).toBe(true);
  });
});


