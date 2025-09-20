#!/usr/bin/env node
import 'dotenv/config';

const API_BASE = process.env.API_BASE || 'http://localhost:3000/api/v1';
const email = process.argv[2] || process.env.EMAIL;
const password = process.argv[3] || process.env.PASSWORD;

if (!email || !password) {
  console.error('Usage: EMAIL=... PASSWORD=... node token.mjs');
  process.exit(1);
}

async function main() {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    console.error('Login failed', res.status, await res.text());
    process.exit(2);
  }
  const data = await res.json();
  const token = data?.session?.access_token;
  if (!token) {
    console.error('No access token returned');
    process.exit(3);
  }
  process.stdout.write(token);
}

main().catch((e) => { console.error(e); process.exit(10); });
