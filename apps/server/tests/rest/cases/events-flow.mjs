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

  // Create draft event
  const eventPayload = {
    title: 'REST Event',
    description: 'Integration flow',
    event_date: new Date(Date.now() + 7*24*3600*1000).toISOString(),
    min_guests: 2,
    capacity_total: 10,
    meal_type: 'mixed',
    is_public: true,
    location: { name: 'Test Venue', formatted_address: '123 Test St, City' },
    items: [ { name: 'Main', category: 'main', per_guest_qty: 1 } ]
  };
  let res = await authed('POST', '/events', host, eventPayload);
  if (res.status !== 201) throw new Error(`create event failed ${res.status} ${await res.text()}`);
  const created = await res.json();
  const eventId = created.event.id;

  try {
    // Publish
    res = await authed('POST', `/events/${eventId}/publish`, host);
    if (!res.ok) throw new Error(`publish failed ${res.status}`);

    // Guest creates join request
    res = await authed('POST', `/events/${eventId}/requests`, guest, { party_size: 2 });
    if (res.status !== 201) throw new Error(`join request failed ${res.status}`);
    const jr = await res.json();

    // Host approves
    res = await authed('PATCH', `/events/${eventId}/requests/${jr.id}/approve`, host);
    if (!res.ok) throw new Error(`approve failed ${res.status}`);

    // Guest self-assign first item
    res = await authed('GET', `/events/${eventId}/items`, guest);
    if (!res.ok) throw new Error(`list items failed ${res.status}`);
    const items = await res.json();
    const firstItem = items[0];
  res = await authed('POST', `/events/${eventId}/items/${firstItem.id}/assign`, guest, {});
    if (!res.ok) throw new Error(`assign failed ${res.status}`);

  // Update item via PUT (OpenAPI parity)
  res = await authed('PUT', `/events/${eventId}/items/${firstItem.id}`, host, { name: 'Main (updated)' });
  if (!res.ok) throw new Error(`item update failed ${res.status}`);

    // Validate availability
    res = await fetch(`${API}/events/${eventId}/availability`);
    if (!res.ok) throw new Error(`availability failed ${res.status}`);
    const avail = await res.json();
    if (typeof avail.available !== 'number') throw new Error('invalid availability');

    console.log('✅ events-flow OK');
  } finally {
    try { await authed('POST', `/events/${eventId}/cancel`, host, { reason: 'test-cleanup', notifyGuests: false }); } catch {}
    try { await authed('POST', `/events/${eventId}/purge`, host); } catch {}
    try { await hardDeleteEventCascade(eventId); } catch {}
    try { await hardDeleteByCreator(hostId); } catch {}
    try { await hardDeleteByCreator(guestId); } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
