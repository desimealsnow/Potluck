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
  if (!(await authed('POST', `/events/${eventId}/publish`, host)).ok) throw new Error('publish failed');

  // Guest creates a request (pending)
  const reqRes = await authed('POST', `/events/${eventId}/requests`, guest, { party_size: 1, note: 'pls' });
  if (reqRes.status !== 201) throw new Error(`create request failed ${reqRes.status}`);
  const request = await reqRes.json();

  // Extend hold while pending
  let r = await authed('POST', `/events/${eventId}/requests/${request.id}/extend`, host, { extension_minutes: 30 });
  if (!r.ok) throw new Error(`extend failed ${r.status}`);

  // Move to waitlist and reorder
  r = await authed('PATCH', `/events/${eventId}/requests/${request.id}/waitlist`, host);
  if (!r.ok) throw new Error(`waitlist failed ${r.status}`);

  r = await authed('PATCH', `/events/${eventId}/requests/${request.id}/reorder`, host, { waitlist_pos: 1 });
  if (!r.ok) throw new Error(`reorder failed ${r.status}`);

  // Decline
  r = await authed('PATCH', `/events/${eventId}/requests/${request.id}/decline`, host);
  if (!r.ok) throw new Error(`decline failed ${r.status}`);

  // Create second request and approve it
  const req2 = await authed('POST', `/events/${eventId}/requests`, guest, { party_size: 1 });
  if (req2.status !== 201) throw new Error(`create request#2 failed ${req2.status}`);
  const request2 = await req2.json();

  r = await authed('PATCH', `/events/${eventId}/requests/${request2.id}/approve`, host);
  if (!r.ok) throw new Error(`approve failed ${r.status}`);

  // Guest cancels a new pending request
  const req3 = await authed('POST', `/events/${eventId}/requests`, guest, { party_size: 1 });
  if (req3.status !== 201) throw new Error(`create request#3 failed ${req3.status}`);
  const request3 = await req3.json();

  r = await authed('PATCH', `/events/${eventId}/requests/${request3.id}/cancel`, guest);
  if (!r.ok) throw new Error(`cancel failed ${r.status}`);

  console.log('✅ requests-actions OK');
}

main().catch((e) => { console.error(e); process.exit(1); });