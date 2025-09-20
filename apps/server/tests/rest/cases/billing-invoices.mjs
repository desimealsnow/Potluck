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

  // List invoices
  let res = await authed('GET', '/billing/invoices', token);
  if (!res.ok) throw new Error(`list invoices failed ${res.status}`);
  const invoices = await res.json();
  if (Array.isArray(invoices) && invoices.length) {
    const invId = invoices[0].id;
    // Get invoice
    res = await authed('GET', `/billing/invoices/${invId}`, token);
    if (!res.ok) throw new Error(`get invoice failed ${res.status}`);
    // Download PDF
    res = await authed('GET', `/billing/invoices/${invId}/download`, token);
    if (!res.ok) throw new Error(`download invoice failed ${res.status}`);
  }

  console.log('✅ billing-invoices OK');
}

main().catch((e) => { console.error(e); process.exit(1); });