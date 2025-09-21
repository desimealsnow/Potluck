#!/usr/bin/env node
import 'dotenv/config';

const API = process.env.API_BASE || 'http://localhost:3000/api/v1';

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
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

  console.log('🔍 Debugging route matching...');
  
  const host = await login(hostEmail, pass);
  console.log('✅ Host logged in successfully');

  // Test different route patterns
  const routes = [
    '/events/requests',
    '/events/requests/',
    '/events/12345678-1234-1234-1234-123456789012/requests',
    '/events/invalid-uuid/requests'
  ];

  for (const route of routes) {
    console.log(`\n📡 Testing ${route}...`);
    const res = await authed('GET', route, host);
    console.log(`Status: ${res.status}`);
    const responseText = await res.text();
    console.log('Response:', responseText.substring(0, 200) + (responseText.length > 200 ? '...' : ''));
  }
}

main().catch((e) => { 
  console.error('Test failed:', e); 
  process.exit(1); 
});
