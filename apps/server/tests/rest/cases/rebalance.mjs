#!/usr/bin/env node
import 'dotenv/config';
import { hardDeleteEventCascade, hardDeleteByCreator } from '../helpers/admin-cleanup.mjs';

const API = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) throw new Error(`login failed ${res.status}`);
  const data = await res.json();
  return data.session.access_token;
}

function jwtSub(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()).sub; } catch { return null; }
}

async function authed(method, path, token, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined
  });
  return res;
}

async function main() {
  const hostEmail = process.env.HOST_EMAIL || 'host@test.dev';
  const guestEmail = process.env.GUEST_EMAIL || 'participant@test.dev';
  const pass = process.env.HOST_PASSWORD || 'password123';

  const host = await login(hostEmail, pass);
  const guest = await login(guestEmail, pass);
  const hostId = jwtSub(host) || '11111111-1111-1111-1111-111111111111';
  const guestId = jwtSub(guest) || '22222222-2222-2222-2222-222222222222';

  // Create event with multiple items
  const create = await authed('POST', '/events', host, {
    title: 'Rebalance',
    description: 'auto assign unclaimed',
    event_date: new Date(Date.now() + 2*24*3600*1000).toISOString(),
    min_guests: 1,
    capacity_total: 5,
    meal_type: 'mixed',
    is_public: true,
    location: { name: 'Venue', formatted_address: 'Addr' },
    items: [
      { name: 'Dessert', category: 'dessert', per_guest_qty: 1 },
      { name: 'Side', category: 'side', per_guest_qty: 1 },
      { name: 'Drink', category: 'beverage', per_guest_qty: 1 }
    ]
  });
  if (create.status !== 201) throw new Error(`create event failed ${create.status}`);
  const eventId = (await create.json()).event.id;

  try {
    if (!(await authed('POST', `/events/${eventId}/publish`, host)).ok) throw new Error('publish failed');

    // Invite guest
    await authed('POST', `/events/${eventId}/participants`, host, { user_id: '22222222-2222-2222-2222-222222222222' });

    // Run rebalance
    const rb = await authed('POST', `/events/${eventId}/rebalance`, host, { max_per_user: 2 });
    if (!rb.ok) throw new Error(`rebalance failed ${rb.status}`);
    const result = await rb.json();
    if (typeof result.assigned !== 'number') throw new Error('rebalance invalid response');

    console.log('✅ rebalance OK');
  } finally {
    try { await authed('POST', `/events/${eventId}/cancel`, host, { reason: 'test-cleanup', notifyGuests: false }); } catch {}
    try { await authed('POST', `/events/${eventId}/purge`, host); } catch {}
    try { await hardDeleteEventCascade(eventId); } catch {}
    try { await hardDeleteByCreator(hostId); } catch {}
    try { await hardDeleteByCreator(guestId); } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });