import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), 'apps/server/.env') });
config({ path: resolve(process.cwd(), '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://abucxqflzhtjtwxmjrmj.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_ID = '96a9b816-b2e7-40ee-bd84-902b1df3583d';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function testServerLogic() {
  console.log('🧪 Testing server logic for host name resolution...');
  console.log('');

  // Simulate the server logic
  let hostProfile = null;
  
  // 1. Try user_profiles table
  console.log('1️⃣ Checking user_profiles...');
  const { data: host, error: hostError } = await admin
    .from('user_profiles')
    .select('display_name, avatar_url')
    .eq('user_id', USER_ID)
    .maybeSingle();
  
  if (!hostError && host) {
    hostProfile = host;
    console.log('   user_profiles result:', host);
  } else {
    console.log('   user_profiles error:', hostError);
  }

  // 2. Fallback to auth.users
  if (!hostProfile || !hostProfile.display_name) {
    console.log('2️⃣ Fallback to auth.users...');
    try {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(USER_ID);
      if (!userError && userData?.user) {
        const user = userData.user;
        const display = user.user_metadata?.display_name || (user.email ? String(user.email).split('@')[0] : null);
        console.log('   auth.users result:', {
          email: user.email,
          user_metadata: user.user_metadata,
          computed_display: display
        });
        
        if (display) {
          hostProfile = {
            display_name: display,
            avatar_url: user.user_metadata?.avatar_url ?? null,
          };
          console.log('   Updated hostProfile:', hostProfile);
        }
      } else {
        console.log('   auth.users error:', userError);
      }
    } catch (authError) {
      console.log('   auth.users exception:', authError.message);
    }
  }

  // 3. Final fallback
  if (!hostProfile || !hostProfile.display_name) {
    console.log('3️⃣ Final fallback...');
    hostProfile = {
      display_name: 'Host',
      avatar_url: null,
    };
  }

  console.log('');
  console.log('🎯 Final Result:');
  console.log('   Host name:', hostProfile.display_name);
  console.log('   Host profile:', hostProfile);
}

testServerLogic().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
