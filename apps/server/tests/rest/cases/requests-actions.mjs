#!/usr/bin/env node
import 'dotenv/config';

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

  // Create and publish an event
  const create = await authed('POST', '/events', host, {
    title: 'Requests Flow',
    description: 'Join requests lifecycle',
    event_date: new Date(Date.now() + 3*24*3600*1000).toISOString(),
    min_guests: 1,
    capacity_total: 5,
    meal_type: 'mixed',
    is_public: true,
    location: { name: 'Venue', formatted_address: 'Addr' },
    items: [ { name: 'Dish', category: 'main', per_guest_qty: 1 } ]
  });
  if (create.status !== 201) throw new Error(`create event failed ${create.status}`);
  const eventId = (await create.json()).event.id;

  try {
    const pub = await authed('POST', `/events/${eventId}/publish`, host);
    if (!pub.ok) throw new Error('publish failed');

    // 1) Guest creates a request and host extends hold (pending)
    let res = await authed('POST', `/events/${eventId}/requests`, guest, { party_size: 1, note: 'pls' });
    if (res.status !== 201) throw new Error(`create request failed ${res.status}`);
    const reqPending = await res.json();

    res = await authed('POST', `/events/${eventId}/requests/${reqPending.id}/extend`, host, { extension_minutes: 30 });
    if (!res.ok) throw new Error(`extend failed ${res.status}`);

    // 2) Host declines the same pending request
    res = await authed('PATCH', `/events/${eventId}/requests/${reqPending.id}/decline`, host);
    if (!res.ok) throw new Error(`decline failed ${res.status}`);

    // 3) Host waitlists and reorders a new pending request
    res = await authed('POST', `/events/${eventId}/requests`, guest, { party_size: 1 });
    if (res.status !== 201) throw new Error(`create request#waitlist failed ${res.status}`);
    const reqWaitlist = await res.json();

    res = await authed('PATCH', `/events/${eventId}/requests/${reqWaitlist.id}/waitlist`, host);
    if (!res.ok) throw new Error(`waitlist failed ${res.status}`);

    res = await authed('PATCH', `/events/${eventId}/requests/${reqWaitlist.id}/reorder`, host, { waitlist_pos: 1 });
    if (!res.ok) throw new Error(`reorder failed ${res.status}`);

    // 4) Host approves a pending request
    res = await authed('POST', `/events/${eventId}/requests`, guest, { party_size: 1 });
    if (res.status !== 201) throw new Error(`create request#approve failed ${res.status}`);
    const reqApprove = await res.json();

    res = await authed('PATCH', `/events/${eventId}/requests/${reqApprove.id}/approve`, host);
    if (!res.ok) throw new Error(`approve failed ${res.status}`);

    // 5) Guest cancels a new pending request
    res = await authed('POST', `/events/${eventId}/requests`, guest, { party_size: 1 });
    if (res.status !== 201) throw new Error(`create request#cancel failed ${res.status}`);
    const reqCancel = await res.json();

    res = await authed('PATCH', `/events/${eventId}/requests/${reqCancel.id}/cancel`, guest);
    if (!res.ok) throw new Error(`cancel failed ${res.status}`);

    // Optional promote
    try { await authed('POST', `/events/${eventId}/requests/promote`, host); } catch {}

    console.log('✅ requests-actions OK');
  } finally {
    try { await authed('POST', `/events/${eventId}/cancel`, host, { reason: 'test-cleanup', notifyGuests: false }); } catch {}
    try { await authed('POST', `/events/${eventId}/purge`, host); } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });