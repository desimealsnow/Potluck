
import { config as loadDotEnv } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { beforeAll, afterAll, vi, expect } from 'vitest';
import { createApp } from '../../src/app';
import { createClient } from '@supabase/supabase-js';
import logger from '../../src/logger';

const testEnvPath = resolve(__dirname, '../../.env.test');
const defaultEnvPath = resolve(__dirname, '../../.env');
const OWNER_EMAIL = process.env.TEST_OWNER_EMAIL ?? 'ramesh1@gmail.com';
const OWNER_PASSWORD = process.env.TEST_OWNER_PASSWORD ?? 'secret123';

if (existsSync(testEnvPath)) {
  loadDotEnv({ path: testEnvPath });
} else if (existsSync(defaultEnvPath)) {
  loadDotEnv({ path: defaultEnvPath });
} else {
  // Optionally: Warn or throw
  console.warn('[WARN] No .env.test or .env file found!');
}

export const app = createApp();

export function getSupabase() {
    if (!process.env.TEST_SUPABASE_URL || !process.env.TEST_SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('Missing Supabase test env vars!');
    }
  return createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!
  );
}


/** Utility: sign a JWT for user-id “u1” (owner) */
export async function ownerToken(): Promise<string> {
  const sb = getSupabase();
  const { data, error } = await sb.auth.signInWithPassword({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
  });
  if (error) {
    logger.error(`[AUTH] Owner sign-in failed: ${JSON.stringify(error)}`);
  } else {
    logger.debug(`[AUTH] Owner sign-in succeeded: ${data?.user?.email}`);
  }
  return data?.session?.access_token ?? '';
}
/** Utility: outsider JWT */
export async function outsiderToken(): Promise<string> {
  const sb = getSupabase();
  const { data } = await sb.auth.signInWithPassword({
    email: 'outsider@test.dev',
    password: 'password'
  });
  return data?.session?.access_token ?? '';
}

/** Clean DB between tests */
export async function resetEvents() {
  const sb = getSupabase();
  await sb.from('events').delete().neq('id', '');
}

/* -- hooks available everywhere -- */
beforeAll(async () => {
  // Seed two users if they’re not there already
  const sb = getSupabase();
  await sb.rpc('seed_test_users');             // write a SQL function or script
});

afterAll(async () => {
  await resetEvents();
  vi.restoreAllMocks();
});
