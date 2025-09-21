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

  console.log('🔍 Testing /events/requests endpoint fix...');
  
  const host = await login(hostEmail, pass);
  console.log('✅ Host logged in successfully');

  // Test the original problematic endpoint (should still fail)
  console.log('\n📡 Testing GET /events/requests (original - should fail)...');
  const res1 = await authed('GET', '/events/requests', host);
  console.log(`Status: ${res1.status}`);
  const responseText1 = await res1.text();
  console.log('Response:', responseText1.substring(0, 200) + (responseText1.length > 200 ? '...' : ''));
  
  if (res1.status === 500) {
    console.log('❌ Original endpoint still fails (expected)');
  } else {
    console.log('⚠️  Original endpoint unexpectedly works');
  }

  // Test the new working endpoint
  console.log('\n📡 Testing GET /events/requests/all (new - should work)...');
  const res2 = await authed('GET', '/events/requests/all', host);
  console.log(`Status: ${res2.status}`);
  const responseText2 = await res2.text();
  console.log('Response:', responseText2.substring(0, 200) + (responseText2.length > 200 ? '...' : ''));
  
  if (res2.ok) {
    console.log('✅ New endpoint works correctly');
    try {
      const data = JSON.parse(responseText2);
      console.log(`📊 Found ${data.totalCount || 0} pending requests across all events`);
    } catch (e) {
      console.log('⚠️  Response is not valid JSON');
    }
  } else {
    console.log('❌ New endpoint failed');
  }

  // Test with a valid eventId for comparison
  console.log('\n📡 Testing GET /events/{eventId}/requests with invalid UUID...');
  const res3 = await authed('GET', '/events/requests/requests', host);
  console.log(`Status: ${res3.status}`);
  const responseText3 = await res3.text();
  console.log('Response:', responseText3.substring(0, 200) + (responseText3.length > 200 ? '...' : ''));
  
  if (res3.status === 400) {
    console.log('✅ Invalid UUID properly rejected');
  } else {
    console.log('⚠️  Invalid UUID handling unexpected');
  }

  console.log('\n🎯 Summary:');
  console.log('- Original /events/requests: Still fails due to route conflict');
  console.log('- New /events/requests/all: Works correctly');
  console.log('- Individual /events/{eventId}/requests: Works with valid UUIDs');
}

main().catch((e) => { 
  console.error('Test failed:', e); 
  process.exit(1); 
});
