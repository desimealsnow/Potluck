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

  let subscriptionId;

  try {
    // List plans
    const plansRes = await authed('GET', '/billing/plans', host);
    if (!plansRes.ok) throw new Error(`list plans failed ${plansRes.status}`);
    const plans = await plansRes.json();
    if (plans.length === 0) {
      console.warn('No billing plans found. Skipping subscription tests.');
      return;
    }
    const planId = plans[0].id;

    // Seed subscription (dev helper)
    const seedRes = await authed('POST', '/payments-dev/seed-subscription', host, {
      user_id: '11111111-1111-1111-1111-111111111111',
      plan_id: planId,
      provider: 'lemonsqueezy',
      status: 'active',
      provider_subscription_id: uuidv4(),
    });
    if (seedRes.status !== 200) throw new Error(`seed subscription failed ${seedRes.status} ${await seedRes.text()}`);
    const seededSub = await seedRes.json();
    subscriptionId = seededSub.data.id;

    // List subscriptions
    let listRes = await authed('GET', '/billing/subscriptions', host);
    if (!listRes.ok) throw new Error(`list subscriptions failed ${listRes.status}`);
    const subscriptions = await listRes.json();
    if (!subscriptions.some(s => s.id === subscriptionId)) throw new Error('new subscription not in list');

    // Get specific subscription
    let getRes = await authed('GET', `/billing/subscriptions/${subscriptionId}`, host);
    if (!getRes.ok) throw new Error(`get subscription failed ${getRes.status}`);
    const fetchedSub = await getRes.json();
    if (fetchedSub.id !== subscriptionId) throw new Error('fetched subscription ID mismatch');

    // Update subscription
    let updateRes = await authed('PUT', `/billing/subscriptions/${subscriptionId}`, host, { cancel_at_period_end: true });
    if (!updateRes.ok) throw new Error(`update subscription failed ${updateRes.status}`);

    // Cancel
    let cancelRes = await authed('DELETE', `/billing/subscriptions/${subscriptionId}`, host);
    if (!cancelRes.ok) throw new Error(`cancel subscription failed ${cancelRes.status}`);

    // Reactivate
    let reactivateRes = await authed('POST', `/billing/subscriptions/${subscriptionId}/reactivate`, host);
    if (!reactivateRes.ok) throw new Error(`reactivate subscription failed ${reactivateRes.status}`);

    console.log('✅ billing-subscriptions OK');

  } finally {
    // Clean up DB row via service role if created
    if (subscriptionId) {
      const { createClient } = await import('@supabase/supabase-js');
      const adminSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await adminSupabase.from('user_subscriptions').delete().eq('id', subscriptionId);
    }
    try { await hardDeleteByCreator(hostId); } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
