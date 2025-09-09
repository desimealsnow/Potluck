import { createClient } from '@supabase/supabase-js';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config as loadDotEnv } from 'dotenv';
import 'dotenv/config';



const testEnvPath = resolve(__dirname, '../../.env.test');
const defaultEnvPath = resolve(__dirname, '../../.env');

let { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if(!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY){
    if (existsSync(testEnvPath)) {
    loadDotEnv({ path: testEnvPath });
    SUPABASE_URL = process.env.TEST_SUPABASE_URL;
    SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;    
  }
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
