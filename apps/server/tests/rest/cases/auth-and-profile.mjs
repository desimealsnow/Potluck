#!/usr/bin/env node
import 'dotenv/config';
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
  const hostPass = process.env.HOST_PASSWORD || 'password123';
  const token = await login(hostEmail, hostPass);
  const hostId = jwtSub(token) || '11111111-1111-1111-1111-111111111111';

  try {
    let res = await authed('GET', '/user-profile/me', token);
    if (res.status === 404) {
      const payload = {
        display_name: 'Test User',
        meal_preferences: ['Vegetarian'],
        city: 'San Francisco',
        latitude: 37.7749,
        longitude: -122.4194,
        discoverability_radius_km: 25
      };
      res = await authed('POST', '/user-profile/setup', token, payload);
      if (!res.ok) throw new Error('profile setup failed');
    }
    const profile = await (await authed('GET', '/user-profile/me', token)).json();
    if (!profile || !profile.user_id) throw new Error('invalid profile response');
    console.log('✅ auth-and-profile OK');
  } finally {
    try { await hardDeleteByCreator(hostId); } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(1); });