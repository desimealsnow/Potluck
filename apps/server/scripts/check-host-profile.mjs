import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Try to load .env from multiple locations
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), 'apps/server/.env') });
config({ path: resolve(process.cwd(), '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://abucxqflzhtjtwxmjrmj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = process.argv[2] || '96a9b816-b2e7-40ee-bd84-902b1df3583d';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set them in your environment or .env file');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function main() {
  console.log('🔍 Checking host profile for user:', USER_ID);
  console.log('📡 Supabase URL:', SUPABASE_URL);
  console.log('');

  // 1. Check user_profiles table
  console.log('1️⃣ Checking user_profiles table...');
  const { data: profile, error: profileError } = await admin
    .from('user_profiles')
    .select('display_name, avatar_url, user_id')
    .eq('user_id', USER_ID)
    .maybeSingle();

  console.log('   Result:', profile);
  console.log('   Error:', profileError || 'none');
  console.log('');

  // 2. Check auth.users table
  console.log('2️⃣ Checking auth.users table...');
  try {
    const { data: userData, error: authError } = await admin.auth.admin.getUserById(USER_ID);
    console.log('   Error:', authError || 'none');
    
    if (userData?.user) {
      const user = userData.user;
      console.log('   User ID:', user.id);
      console.log('   Email:', user.email);
      console.log('   User Metadata:', user.user_metadata);
      console.log('   Created At:', user.created_at);
      
      // Compute display name
      const display = user.user_metadata?.display_name || (user.email ? String(user.email).split('@')[0] : null);
      console.log('   Computed Display Name:', display);
    } else {
      console.log('   No user data found');
    }
  } catch (error) {
    console.log('   Auth Error:', error.message);
  }
  console.log('');

  // 3. Check if user exists in events table
  console.log('3️⃣ Checking if user created any events...');
  const { data: events, error: eventsError } = await admin
    .from('events')
    .select('id, title, created_by, created_at')
    .eq('created_by', USER_ID)
    .limit(5);

  console.log('   Events created by this user:', events?.length || 0);
  if (events && events.length > 0) {
    console.log('   Sample events:');
    events.forEach(event => {
      console.log(`     - ${event.title} (${event.id}) - ${event.created_at}`);
    });
  }
  console.log('   Error:', eventsError || 'none');
  console.log('');

  // 4. Test the actual API endpoint
  console.log('4️⃣ Testing getEventDetails API logic...');
  if (events && events.length > 0) {
    const eventId = events[0].id;
    console.log(`   Testing with event: ${eventId}`);
    
    // Simulate the server logic
    let hostProfile = null;
    
    // Try user_profiles first
    const { data: host, error: hostError } = await admin
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', USER_ID)
      .maybeSingle();
    
    if (!hostError && host) {
      hostProfile = host;
    }
    
    // Fallback: Use a more meaningful default when display_name is null
    if (!hostProfile || !hostProfile.display_name) {
      // If we still don't have a display name, use a generic fallback
      hostProfile = {
        display_name: 'Host',
        avatar_url: null,
      };
    }
    
    // Final result
    const finalHostName = hostProfile?.display_name || 'Host';
    console.log('   Final host name that would be returned:', finalHostName);
    console.log('   Host profile:', hostProfile);
  } else {
    console.log('   No events found to test with');
  }
}

main().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});