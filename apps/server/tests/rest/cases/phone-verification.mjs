import { t } from '../testHarness.mjs';

t.case('Phone verification flow and gating', async (api) => {
  // 1) Get profile
  const me = await api.get('/api/v1/user-profile/me');
  t.expect(me.status).toBe(200);

  // 2) Trigger send OTP
  const send = await api.post('/api/v1/user-profile/phone/send', { phone_e164: '+15555550123' });
  t.expect(send.status).toBe(200);

  // 3) Attempt to create event – should 403 if not verified
  const create = await api.post('/api/v1/events', {
    title: 'Phone Gate Test',
    event_date: new Date(Date.now() + 86400000).toISOString(),
    location: { name: 'Test', formatted_address: 'Test', latitude: 1, longitude: 1 },
    items: []
  });
  t.expect([403, 400, 401]).toContain(create.status);
});

