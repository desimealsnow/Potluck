import { config as loadDotEnv } from 'dotenv';
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
  }
};

// Auth token cache to avoid repeated API calls
const tokenCache = new Map<string, { token: string, expiresAt: number }>();

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

  // Create user-scoped client for auth
  const authClient = createClient(
    process.env.TEST_SUPABASE_URL!,
    process.env.TEST_SUPABASE_ANON_KEY!
  );

  const { data, error } = await authClient.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });

  if (error || !data.session?.access_token) {
    logger.error(`[TEST-SETUP] Failed to authenticate ${userType}:`, error);
    throw new Error(`Failed to get auth token for ${userType}: ${error?.message}`);
  }

  // Cache token with expiration
  const expiresAt = Date.now() + (data.session.expires_in * 1000);
  tokenCache.set(cacheKey, {
    token: data.session.access_token,
    expiresAt
  });

  logger.debug(`[TEST-SETUP] Authenticated ${userType} (${user.email})`);
  return data.session.access_token;
}

/**
 * Database cleanup utilities
 */
export class TestDbHelper {
  static async cleanupAll(): Promise<void> {
    logger.debug('[TEST-SETUP] Running full database cleanup');
    
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
  }

  static async cleanupTable(tableName: string): Promise<void> {
    logger.debug(`[TEST-SETUP] Cleaning table: ${tableName}`);
    
    const { error } = await testSupabase
      .from(tableName)
      .delete()
      .neq('id', '');

    if (error && !error.message.includes('does not exist')) {
      logger.warn(`[TEST-SETUP] Error cleaning table ${tableName}:`, error.message);
    }
  }

  static async seedTestUsers(): Promise<void> {
    logger.debug('[TEST-SETUP] Seeding test users');

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
  }
}

// Global Jest setup
beforeAll(async () => {
  logger.info('[TEST-SETUP] Starting global test setup');
  
  // Verify database connection
  const { data, error } = await testSupabase
    .from('events')
    .select('count')
    .limit(1);
    
  if (error) {
    logger.error('[TEST-SETUP] Database connection failed:', error);
    throw new Error(`Test database connection failed: ${error.message}`);
  }

  // Seed test users
  await TestDbHelper.seedTestUsers();
  
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