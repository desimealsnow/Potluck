#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey);

const USERS = [
  { email: 'host@test.dev', password: 'password123', id: '11111111-1111-1111-1111-111111111111', display_name: 'Test HOST' },
  { email: 'participant@test.dev', password: 'password123', id: '22222222-2222-2222-2222-222222222222', display_name: 'Test PARTICIPANT' },
  { email: 'outsider@test.dev', password: 'password123', id: '33333333-3333-3333-3333-333333333333', display_name: 'Test OUTSIDER' }
];

async function ensureUser(u) {
  // Try sign-in with anon to check existence
  const anon = createClient(url, process.env.SUPABASE_ANON_KEY);
  const attempt = await anon.auth.signInWithPassword({ email: u.email, password: u.password });
  if (attempt.data?.session?.access_token) {
    console.log('User already exists and can log in:', u.email);
    return attempt.data.user?.id;
  }
  // Create via admin
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { display_name: u.display_name }
  });
  if (error) {
    if (!/already exists/i.test(error.message)) {
      console.error('createUser failed:', u.email, error.message);
    }
  }
  const userId = data?.user?.id;
  // Upsert profile
  const id = userId || u.id;
  await admin.from('user_profiles').upsert({
    id,
    user_id: id,
    display_name: u.display_name,
    discoverability_enabled: true,
    discoverability_radius_km: 25,
    geo_precision: 'city',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  return id;
}

async function main() {
  for (const u of USERS) {
    await ensureUser(u);
  }
  console.log('✅ Seeded test users.');
}

main().catch(e => { console.error(e); process.exit(1); });
