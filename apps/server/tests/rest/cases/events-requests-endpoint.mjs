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

  console.log('🔍 Testing /events/requests endpoint...');
  
  const host = await login(hostEmail, pass);
  console.log('✅ Host logged in successfully');

  // Test the fixed endpoint
  console.log('📡 Testing GET /events/requests/all...');
  const res = await authed('GET', '/events/requests/all', host);
  
  console.log(`Status: ${res.status}`);
  const responseText = await res.text();
  console.log('Response:', responseText);
  
  if (res.ok) {
    console.log('✅ /events/requests endpoint works correctly');
  } else {
    console.log('❌ /events/requests endpoint failed');
    try {
      const errorData = JSON.parse(responseText);
      console.log('Error details:', errorData);
    } catch (e) {
      console.log('Raw error response:', responseText);
    }
  }

  // Test with a valid eventId for comparison
  console.log('\n📡 Testing GET /events/{eventId}/requests with invalid UUID...');
  const res2 = await authed('GET', '/events/requests/requests', host);
  console.log(`Status: ${res2.status}`);
  const responseText2 = await res2.text();
  console.log('Response:', responseText2);
}

main().catch((e) => { 
  console.error('Test failed:', e); 
  process.exit(1); 
});
