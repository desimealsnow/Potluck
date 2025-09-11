import { config as loadDotEnv } from 'dotenv';
import { beforeAll, afterAll, beforeEach } from '@jest/globals';
import { resolve } from 'path';
import { existsSync } from 'fs';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import logger from '../src/logger';

// Load test environment variables
const testEnvPath = resolve(__dirname, '../.env.test');
const defaultEnvPath = resolve(__dirname, '../.env');

if (existsSync(testEnvPath)) {
  loadDotEnv({ path: testEnvPath });
  console.log('[TEST-SETUP] Loaded .env.test');
} else if (existsSync(defaultEnvPath)) {
  loadDotEnv({ path: defaultEnvPath });
  console.log('[TEST-SETUP] Loaded .env (fallback)');
} else {
  console.warn('[TEST-SETUP] No .env.test or .env file found!');
}

// Validate required environment variables
const requiredEnvVars = [
  'TEST_SUPABASE_URL',
  'TEST_SUPABASE_SERVICE_ROLE_KEY',
  'TEST_SUPABASE_ANON_KEY'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required test environment variable: ${envVar}`);
  }
}

// Test database client (service role for setup/teardown)
export const testSupabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Test users for consistent auth testing
export const TEST_USERS = {
  HOST: {
    email: 'host@test.dev',
    password: 'password123',
    id: '11111111-1111-1111-1111-111111111111'
  },
  PARTICIPANT: {
    email: 'participant@test.dev', 
    password: 'password123',
    id: '22222222-2222-2222-2222-222222222222'
  },
  OUTSIDER: {
    email: 'outsider@test.dev',
    password: 'password123',
    id: '33333333-3333-3333-3333-333333333333'
  },
  ADMIN: {
    email: 'admin@test.dev',
    password: 'password123',
    id: '44444444-4444-4444-4444-444444444444'
  }
};

// Auth token cache to avoid repeated API calls
const tokenCache = new Map<string, { token: string, expiresAt: number }>();
// Track created/listed auth user IDs by email (debug and potential future use)
const authUserIdByEmail = new Map<string, string>();

function mask(value?: string): string {
  if (!value) return 'missing';
  return value.length <= 8 ? '********' : `${value.slice(0, 4)}****${value.slice(-4)}`;
}

/**
 * Get JWT token for a test user, with caching to improve performance
 */
export async function getAuthToken(userType: keyof typeof TEST_USERS): Promise<string> {
  const user = TEST_USERS[userType];
  const cacheKey = user.email;
  const cached = tokenCache.get(cacheKey);
  
  // Return cached token if still valid (with 5 minute buffer)
  if (cached && cached.expiresAt > Date.now() + 300000) {
    return cached.token;
  }

  // Always use real Supabase in tests (no mock database mode)

  try {
    // Create user-scoped client for auth
    const authClient = createClient(
      process.env.TEST_SUPABASE_URL!,
      process.env.TEST_SUPABASE_ANON_KEY!
    );

    logger.info('[TEST-SETUP] getAuthToken: start', {
      userType,
      email: user.email,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        MOCK_DATABASE: process.env.MOCK_DATABASE,
        TEST_SUPABASE_URL: process.env.TEST_SUPABASE_URL,
        TEST_SUPABASE_ANON_KEY: mask(process.env.TEST_SUPABASE_ANON_KEY),
        TEST_SUPABASE_SERVICE_ROLE_KEY: mask(process.env.TEST_SUPABASE_SERVICE_ROLE_KEY)
      }
    });

    const { data, error } = await authClient.auth.signInWithPassword({
      email: user.email,
      password: user.password
    });

    if (error || !data.session?.access_token) {
      logger.warn('[TEST-SETUP] signIn failed', { userType, email: user.email, error: error?.message });

      // Ensure auth user exists (service role)
      await ensureAuthUser(user.email, user.password, user.id);

      // Retry sign-in
      const retry = await authClient.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });

      if (!retry.data.session?.access_token) {
        logger.error('[TEST-SETUP] retry signIn failed', { userType, email: user.email });
        throw new Error(`[TEST-SETUP] Retry auth failed for ${userType}`);
      }

      const expiresAt = Date.now() + (retry.data.session.expires_in * 1000);
      tokenCache.set(cacheKey, {
        token: retry.data.session.access_token,
        expiresAt
      });
      logger.info('[TEST-SETUP] signIn succeeded on retry', { userType, email: user.email });
      return retry.data.session.access_token;
    }

    // Cache token with expiration
    const expiresAt = Date.now() + (data.session.expires_in * 1000);
    tokenCache.set(cacheKey, {
      token: data.session.access_token,
      expiresAt
    });

    logger.debug(`[TEST-SETUP] Authenticated ${userType} (${user.email})`);
    return data.session.access_token;
  } catch (err) {
    logger.warn('[TEST-SETUP] getAuthToken caught', { userType, email: user.email, error: (err as any)?.message || String(err) });
    try {
      await ensureAuthUser(user.email, user.password, user.id);
      // Try again after ensuring the user
      const authClient = createClient(
        process.env.TEST_SUPABASE_URL!,
        process.env.TEST_SUPABASE_ANON_KEY!
      );
      const retry = await authClient.auth.signInWithPassword({
        email: user.email,
        password: user.password
      });
      if (retry.data.session?.access_token) {
        const expiresAt = Date.now() + (retry.data.session.expires_in * 1000);
        tokenCache.set(cacheKey, { token: retry.data.session.access_token, expiresAt });
        logger.info('[TEST-SETUP] signIn succeeded after ensureAuthUser', { userType, email: user.email });
        return retry.data.session.access_token;
      }
    } catch (innerErr) {
      logger.warn('[TEST-SETUP] ensureAuthUser failed', { userType, email: user.email, error: (innerErr as any)?.message || String(innerErr) });
    }
    throw new Error(`[TEST-SETUP] Auth failed for ${userType}`);
  }
}

/**
 * Database cleanup utilities
 */
export class TestDbHelper {
  static async cleanupAll(): Promise<void> {
    logger.debug('[TEST-SETUP] Running full database cleanup');
    
    try {
      // Clean tables in dependency order (foreign keys)
      const tables = [
        'event_items',
        'event_participants', 
        'events',
        'user_subscriptions',
        'payment_methods',
        'invoices',
        'billing_plans',
        'locations',
        'profiles' // Don't delete auth.users, just profiles
      ];

      for (const table of tables) {
        const { error } = await testSupabase
          .from(table)
          .delete()
          .neq('id', ''); // Delete all records

        if (error && !error.message.includes('does not exist')) {
          logger.warn(`[TEST-SETUP] Error cleaning table ${table}:`, error.message);
        }
      }
    } catch (err) {
      logger.warn('[TEST-SETUP] Database cleanup failed:', err);
    }
  }

  static async cleanupTable(tableName: string): Promise<void> {
    logger.debug(`[TEST-SETUP] Cleaning table: ${tableName}`);
    
    try {
      const { error } = await testSupabase
        .from(tableName)
        .delete()
        .neq('id', '');

      if (error && !error.message.includes('does not exist')) {
        logger.warn(`[TEST-SETUP] Error cleaning table ${tableName}:`, error.message);
      }
    } catch (err) {
      logger.warn(`[TEST-SETUP] Error cleaning table ${tableName}:`, err);
    }
  }

  static async seedTestUsers(): Promise<void> {
    logger.debug('[TEST-SETUP] Seeding test users');

    try {
      // Ensure auth users exist first
      for (const [_, u] of Object.entries(TEST_USERS)) {
        await ensureAuthUser(u.email, u.password, u.id);
      }

      // Try to call the seed function if it exists
      const { error } = await testSupabase.rpc('seed_test_users');
      
      if (error) {
        logger.warn('[TEST-SETUP] Failed to seed test users via RPC:', error.message);
        
        // Fallback: manually ensure test users exist in profiles
        for (const [role, user] of Object.entries(TEST_USERS)) {
          const { error: profileError } = await testSupabase
            .from('profiles')
            .upsert({
              id: user.id,
              email: user.email,
              display_name: `Test ${role}`,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (profileError) {
            logger.warn(`[TEST-SETUP] Failed to upsert profile for ${role}:`, profileError.message);
          }
        }
      }
    } catch (err) {
      logger.warn('[TEST-SETUP] Failed to seed test users:', err);
    }
  }

  /**
   * Reset sequence counters to avoid ID conflicts
   */
  static async resetSequences(): Promise<void> {
    const sequences = [
      'events_id_seq',
      'event_items_id_seq', 
      'event_participants_id_seq',
      'locations_id_seq'
    ];

    try {
      for (const seq of sequences) {
        const { error } = await testSupabase.rpc('setval', {
          sequence_name: seq,
          new_value: 1,
          is_called: false
        });
        
        if (error && !error.message.includes('does not exist')) {
          logger.warn(`[TEST-SETUP] Failed to reset sequence ${seq}:`, error.message);
        }
      }
    } catch (err) {
      logger.warn('[TEST-SETUP] Failed to reset sequences:', err);
    }
  }
}

// Global Jest setup
beforeAll(async () => {
  logger.info('[TEST-SETUP] Starting global test setup');
  try {
    // Verify database connection
    const { data, error } = await testSupabase
      .from('events')
      .select('count')
      .limit(1);
      
    if (error) {
      logger.warn('[TEST-SETUP] Database connection failed:', error.message);
      throw error;
    }

    // Seed test users
    await TestDbHelper.seedTestUsers();
  } catch (err) {
    logger.warn('[TEST-SETUP] Database setup failed:', err);
    throw err as any;
  }
  
  logger.info('[TEST-SETUP] Global setup completed');
});

// Global Jest teardown
afterAll(async () => {
  logger.info('[TEST-SETUP] Starting global test teardown');
  
  // Clear token cache
  tokenCache.clear();
  
  // Final cleanup
  await TestDbHelper.cleanupAll();
  
  logger.info('[TEST-SETUP] Global teardown completed');
});

// Per-suite setup (run before each describe block)
beforeEach(async () => {
  // Clean database state for isolation
  await TestDbHelper.cleanupAll();
  
  // Re-seed users for each test
  await TestDbHelper.seedTestUsers();
});

export default {
  testSupabase,
  TEST_USERS,
  getAuthToken,
  TestDbHelper
};

/**
 * Ensure a Supabase Auth user exists (by email), creating if missing.
 * Uses the service role (testSupabase) to create confirmed users with a password.
 */
async function ensureAuthUser(email: string, password: string, userId?: string): Promise<void> {
  try {
    // Attempt sign-in using anon client to see if user+password already valid
    const anon = createClient(process.env.TEST_SUPABASE_URL!, process.env.TEST_SUPABASE_ANON_KEY!);
    const attempt = await anon.auth.signInWithPassword({ email, password });
    if (attempt.data.session?.access_token) {
      logger.info('[TEST-SETUP] ensureAuthUser: already valid', { email });
      return; // user exists and password works
    }

    // Create via admin (service role). If already exists, createUser may throw; ignore duplicate.
    const admin = (testSupabase as any).auth.admin;
    logger.info('[TEST-SETUP] ensureAuthUser: creating via admin', { email });
    const createdRes = await admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userId ? { fixed_id: userId } : undefined
    }).catch((e: any) => {
      const msg = typeof e?.message === 'string' ? e.message : String(e);
      if (!/already exists/i.test(msg)) throw e;
    });
    if (createdRes?.data?.user?.id) {
      logger.info('[TEST-SETUP] ensureAuthUser: created', { email, id: createdRes.data.user.id });
    }

    // Fetch the user to capture its real id
    const list = await admin.listUsers({ page: 1, perPage: 100 });
    const created = list?.data?.users?.find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (created?.id) authUserIdByEmail.set(email, created.id);
    logger.info('[TEST-SETUP] ensureAuthUser: listUsers result', { found: !!created, email });
  } catch (e) {
    logger.warn('[TEST-SETUP] ensureAuthUser error', { email, error: (e as any)?.message || e });
  }
}
