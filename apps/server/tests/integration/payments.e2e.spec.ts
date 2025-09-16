import request from 'supertest';
import { createApp } from '../../src/app';
import { getAuthToken } from '../setup';

describe('Payments E2E', () => {
  const app = createApp();

  it('creates a checkout session (lemonsqueezy) end-to-end', async () => {
    const token = await getAuthToken('HOST');
    const res = await request(app)
      .post('/billing/checkout/subscription')
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', 'default')
      .send({ plan_id: 'test-variant-id', provider: 'lemonsqueezy' })
      .expect(200);

    expect(res.body?.data?.checkout_url || res.body?.checkout_url).toBeTruthy();
  });
});


