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
  const pass = process.env.HOST_PASSWORD || 'password123';
  const token = await login(hostEmail, pass);

  // Start with clean list
  let res = await authed('GET', '/billing/payment-methods', token);
  if (!res.ok) throw new Error(`list methods failed ${res.status}`);

  // Add one
  res = await authed('POST', '/billing/payment-methods', token, {
    provider: 'lemonsqueezy', method_id: 'pm_test_123', is_default: true
  });
  if (res.status !== 201) throw new Error(`add method failed ${res.status}`);
  const method = await res.json();

  // Get it
  res = await authed('GET', `/billing/payment-methods/${method.id}`, token);
  if (!res.ok) throw new Error(`get method failed ${res.status}`);

  // Update default flag
  res = await authed('PUT', `/billing/payment-methods/${method.id}`, token, { is_default: false });
  if (!res.ok) throw new Error(`update method failed ${res.status}`);

  // Set default via action route
  res = await authed('POST', `/billing/payment-methods/${method.id}/set-default`, token);
  if (!res.ok) throw new Error(`set-default failed ${res.status}`);

  // Delete
  res = await authed('DELETE', `/billing/payment-methods/${method.id}`, token);
  if (!(res.status === 204 || res.status === 200)) throw new Error(`delete method failed ${res.status}`);

  console.log('✅ billing-payment-methods OK');
}

main().catch((e) => { console.error(e); process.exit(1); });