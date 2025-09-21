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
  const email = process.env.HOST_EMAIL || 'host@test.dev';
  const pass  = process.env.HOST_PASSWORD || 'password123';
  const token = await login(email, pass);

  // Create a draft event minimal
  let res = await authed('POST', '/events', token, {
    title: 'Linking Test',
    description: 'Test linking items',
    event_date: new Date(Date.now() + 86400000).toISOString(),
    min_guests: 2,
    meal_type: 'mixed',
    location: { name: 'Test Venue' },
    items: []
  });
  if (res.status !== 201) throw new Error(`create event failed ${res.status}`);
  const evt = await res.json();
  const eventId = (evt.event?.id) || evt.id;

  // Ensure we have at least one catalog item (list), otherwise skip catalog test
  res = await authed('GET', '/items/catalog', token);
  const catalog = res.ok ? await res.json() : [];
  const catalogItem = Array.isArray(catalog) && catalog.length ? catalog[0] : null;

  if (catalogItem) {
    // Add event item via catalog_item_id
    res = await authed('POST', `/events/${eventId}/items`, token, {
      name: catalogItem.name,
      category: catalogItem.category,
      per_guest_qty: catalogItem.default_per_guest_qty || 1,
      catalog_item_id: catalogItem.id
    });
    if (!res.ok) throw new Error(`add via catalog failed ${res.status}`);
  }

  // Create a user item
  res = await authed('POST', '/items/me', token, { name: 'Linking Plates', default_per_guest_qty: 1 });
  if (!res.ok) throw new Error(`create user item failed ${res.status}`);
  const created = await res.json();
  const userItemId = created.id || created.data?.id;

  // Add event item via user_item_id
  res = await authed('POST', `/events/${eventId}/items`, token, {
    name: 'Linking Plates',
    per_guest_qty: 1,
    user_item_id: userItemId
  });
  if (!res.ok) throw new Error(`add via user_item_id failed ${res.status}`);

  // Validation: both IDs present → 400
  res = await authed('POST', `/events/${eventId}/items`, token, {
    name: 'Invalid Both',
    per_guest_qty: 1,
    catalog_item_id: catalogItem ? catalogItem.id : '11111111-1111-1111-1111-111111111111',
    user_item_id: userItemId
  });
  if (res.status !== 400) throw new Error(`expected 400 when both IDs present, got ${res.status}`);

  console.log('✅ items-linking OK');
}

main().catch((e) => { console.error(e); process.exit(1); });

