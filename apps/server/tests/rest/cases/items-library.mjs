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

  // List catalog (should succeed even if empty)
  let res = await authed('GET', '/items/catalog?q=Main', token);
  if (!res.ok) throw new Error(`catalog list failed ${res.status}`);
  await res.json();

  // Create user item
  res = await authed('POST', '/items/me', token, {
    name: 'Disposable Plates',
    category: 'supplies',
    unit: 'pack',
    default_per_guest_qty: 0.1,
    dietary_tags: []
  });
  if (res.status !== 201 && res.status !== 200) throw new Error(`create user item failed ${res.status}`);
  const created = await res.json();

  // List my items
  res = await authed('GET', '/items/me', token);
  if (!res.ok) throw new Error(`list my items failed ${res.status}`);
  const mine = await res.json();
  if (!Array.isArray(mine) || !mine.find(x => x.id === (created.id || created.data?.id))) throw new Error('created item not found');

  const id = created.id || created.data?.id;

  // Update my item
  res = await authed('PUT', `/items/me/${id}`, token, { notes: 'Buy eco-friendly' });
  if (!res.ok) throw new Error(`update my item failed ${res.status}`);

  // Delete my item
  res = await authed('DELETE', `/items/me/${id}`, token);
  if (res.status !== 204) throw new Error(`delete my item failed ${res.status}`);

  console.log('✅ items-library OK');
}

main().catch((e) => { console.error(e); process.exit(1); });

