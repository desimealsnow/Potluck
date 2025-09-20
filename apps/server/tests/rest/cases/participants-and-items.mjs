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
  const create = await authed('POST', '/events', host, {
    title: 'Participants & Items',
    description: 'manage items & participants',
    event_date: new Date(Date.now() + 2*24*3600*1000).toISOString(),
    min_guests: 1,
    capacity_total: 5,
    meal_type: 'mixed',
    is_public: true,
    location: { name: 'Venue', formatted_address: 'Addr' },
    items: [ { name: 'Drinks', category: 'beverage', per_guest_qty: 1 } ]
  });
  if (create.status !== 201) throw new Error(`create event failed ${create.status}`);
  const event = await create.json();
  const eventId = event.event.id;

  try {
    if (!(await authed('POST', `/events/${eventId}/publish`, host)).ok) throw new Error('publish failed');

    // Host invites guest (fixed participant id used)
    await authed('POST', `/events/${eventId}/participants`, host, { user_id: '22222222-2222-2222-2222-222222222222' });

    // Guest lists items and self-assign
    let res = await authed('GET', `/events/${eventId}/items`, guest);
    if (!res.ok) throw new Error(`list items failed ${res.status}`);
    let items = await res.json();
    const itemId = items[0].id;

    res = await authed('POST', `/events/${eventId}/items/${itemId}/assign`, guest, {});
    if (!res.ok) throw new Error(`assign failed ${res.status}`);

    // Host adds another item, then fetch it back to get exact id, update it, then delete it
    res = await authed('POST', `/events/${eventId}/items`, host, { name: 'Salad', category: 'side', per_guest_qty: 1 });
    if (!(res.status === 201 || res.status === 200)) throw new Error(`add item failed ${res.status}`);

    // Fetch items again to find the newly added one by name/category
    res = await authed('GET', `/events/${eventId}/items`, host);
    if (!res.ok) throw new Error(`list items (host) failed ${res.status}`);
    items = await res.json();
    const newItem = items.find((i) => i.name === 'Salad' || i.name === 'Green Salad') || items[items.length - 1];

    res = await authed('PATCH', `/events/${eventId}/items/${newItem.id}`, host, { name: 'Green Salad', category: 'side', per_guest_qty: 1 });
    if (!res.ok) throw new Error(`update item failed ${res.status}`);

    res = await authed('DELETE', `/events/${eventId}/items/${newItem.id}`, host);
    if (!res.ok) throw new Error(`delete item failed ${res.status}`);

    // Host lists participants
    res = await authed('GET', `/events/${eventId}/participants`, host);
    if (!res.ok) throw new Error(`list participants failed ${res.status}`);

    console.log('✅ participants-and-items OK');
  } finally {
    try { await authed('POST', `/events/${eventId}/cancel`, host, { reason: 'test-cleanup', notifyGuests: false }); } catch {}
    try { await authed('POST', `/events/${eventId}/purge`, host); } catch {}
    try { await hardDeleteEventCascade(eventId); } catch {}
    try { await hardDeleteByCreator(hostId); } catch {}
    try { await hardDeleteByCreator(guestId); } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
