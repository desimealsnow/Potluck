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

async function meProfile(token) {
  const res = await fetch(`${API}/user-profile/me`, { headers: { Authorization: `Bearer ${token}` } });
  return res;
}

async function setupProfile(token) {
  const payload = {
    display_name: 'Test User',
    meal_preferences: ['Vegetarian'],
    city: 'San Francisco',
    latitude: 37.7749,
    longitude: -122.4194,
    discoverability_radius_km: 25
  };
  const res = await fetch(`${API}/user-profile/setup`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  return res;
}

async function main() {
  const hostEmail = process.env.HOST_EMAIL || 'host@test.dev';
  const hostPass = process.env.HOST_PASSWORD || 'password123';
  const token = await login(hostEmail, hostPass);

  let res = await meProfile(token);
  if (res.status === 404) {
    res = await setupProfile(token);
    if (!res.ok) throw new Error('profile setup failed');
  }
  const profile = await (await meProfile(token)).json();
  if (!profile || !profile.user_id) throw new Error('invalid profile response');
  console.log('✅ auth-and-profile OK');
}

main().catch((e) => { console.error(e); process.exit(1); });