import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadDotEnv } from 'dotenv';
import 'dotenv/config';



const testEnvPath = resolve(__dirname, '../../.env.test');
const defaultEnvPath = resolve(__dirname, '../../.env');

// Always load test env first in test mode
if (process.env.NODE_ENV === 'test' && existsSync(testEnvPath)) {
  loadDotEnv({ path: testEnvPath });
}
// Then load default env as fallback
if (existsSync(defaultEnvPath)) {
  loadDotEnv({ path: defaultEnvPath });
}

let { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

// In test mode, prefer TEST_* variables explicitly
if (process.env.NODE_ENV === 'test') {
  SUPABASE_URL = process.env.TEST_SUPABASE_URL || SUPABASE_URL;
  SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY;
}

// Final fallback: if still missing, try loading from .env.test directly
if ((!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) && existsSync(testEnvPath)) {
  loadDotEnv({ path: testEnvPath });
  SUPABASE_URL = process.env.TEST_SUPABASE_URL || SUPABASE_URL;
  SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || SUPABASE_SERVICE_ROLE_KEY;
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) { 
  throw new Error('Supabase env vars missing');
}

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
