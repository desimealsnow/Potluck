#!/usr/bin/env node
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';
import { hardDeleteByCreator } from '../helpers/admin-cleanup.mjs';

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
  const pass = process.env.HOST_PASSWORD || 'password123';
  const host = await login(hostEmail, pass);
  const hostId = jwtSub(host) || '11111111-1111-1111-1111-111111111111';

  let paymentMethodId;

  try {
    // Add new payment method
    const addRes = await authed('POST', '/billing/payment-methods', host, {
      provider: 'stripe',
      method_id: uuidv4(),
      is_default: true,
      brand: 'visa',
      last_four: '4242',
      exp_month: 12,
      exp_year: 2025
    });
    if (addRes.status !== 201) throw new Error(`add method failed ${addRes.status} ${await addRes.text()}`);
    const newMethod = await addRes.json();
    paymentMethodId = newMethod.id;

    // List payment methods
    let listRes = await authed('GET', '/billing/payment-methods', host);
    if (!listRes.ok) throw new Error(`list methods failed ${listRes.status}`);
    const methods = await listRes.json();
    if (!methods.some(m => m.id === paymentMethodId)) throw new Error('new method not in list');

    // Get specific payment method
    let getRes = await authed('GET', `/billing/payment-methods/${paymentMethodId}`, host);
    if (!getRes.ok) throw new Error(`get method failed ${getRes.status}`);
    const fetchedMethod = await getRes.json();
    if (fetchedMethod.id !== paymentMethodId) throw new Error('fetched method ID mismatch');

    // Update payment method (set is_default to false)
    let updateRes = await authed('PUT', `/billing/payment-methods/${paymentMethodId}`, host, { is_default: false });
    if (!updateRes.ok) throw new Error(`update method failed ${updateRes.status}`);
    const updatedMethod = await updateRes.json();
    if (updatedMethod.is_default !== false) throw new Error('update is_default failed');

    // Set as default payment method
    let setDefaultRes = await authed('POST', `/billing/payment-methods/${paymentMethodId}/set-default`, host);
    if (!setDefaultRes.ok) throw new Error(`set default failed ${setDefaultRes.status}`);
    const defaultMethod = await setDefaultRes.json();
    if (defaultMethod.is_default !== true) throw new Error('set default failed');

    console.log('✅ billing-payment-methods OK');

  } finally {
    // Clean up: Delete the payment method if it was created
    if (paymentMethodId) {
      const deleteRes = await authed('DELETE', `/billing/payment-methods/${paymentMethodId}`, host);
      if (deleteRes.status !== 204) {
        console.warn(`Cleanup: Failed to delete payment method ${paymentMethodId} (status: ${deleteRes.status})`);
      }
    }
    try { await hardDeleteByCreator(hostId); } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
