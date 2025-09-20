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

  let invoiceId;

  try {
    // Seed invoice with service role
    const { createClient } = await import('@supabase/supabase-js');
    const adminSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { data: seededInvoice, error: seedError } = await adminSupabase
      .from('invoices')
      .insert({
        user_id: '11111111-1111-1111-1111-111111111111',
        provider: 'lemonsqueezy',
        amount_cents: 1000,
        currency: 'usd',
        status: 'paid',
        invoice_date: new Date().toISOString(),
        invoice_id: uuidv4(),
      })
      .select('id')
      .single();

    if (seedError) throw new Error(`seed invoice failed: ${seedError.message}`);
    invoiceId = seededInvoice.id;

    // List invoices
    let listRes = await authed('GET', '/billing/invoices', host);
    if (!listRes.ok) throw new Error(`list invoices failed ${listRes.status}`);
    const invoices = await listRes.json();
    if (!invoices.some(i => i.id === invoiceId)) throw new Error('new invoice not in list');

    // Get specific invoice
    let getRes = await authed('GET', `/billing/invoices/${invoiceId}`, host);
    if (!getRes.ok) throw new Error(`get invoice failed ${getRes.status}`);

    // Download invoice PDF
    let downloadRes = await authed('GET', `/billing/invoices/${invoiceId}/download`, host);
    if (!downloadRes.ok) throw new Error(`download invoice failed ${downloadRes.status}`);

    console.log('✅ billing-invoices OK');

  } finally {
    if (invoiceId) {
      const { createClient } = await import('@supabase/supabase-js');
      const adminSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
      await adminSupabase.from('invoices').delete().eq('id', invoiceId);
    }
    try { await hardDeleteByCreator(hostId); } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });