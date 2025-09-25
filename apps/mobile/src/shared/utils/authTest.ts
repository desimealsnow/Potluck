import { supabase } from '@/config/supabaseClient';

/**
 * Test function to debug authentication issues
 * Call this from your app to see what's happening with auth
 */
export async function testAuthentication() {
  console.log('🧪 Testing Authentication...');
  
  try {
    // Check current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    console.log('📊 Session Status:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      hasAccessToken: !!session?.access_token,
      sessionError: sessionError?.message,
    });
    
    if (session?.user) {
      console.log('👤 User Info:', {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role,
      });
    }
    
    // Try to get user directly
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('👤 User Direct Check:', {
      hasUser: !!user,
      userError: userError?.message,
    });
    
    return {
      hasSession: !!session,
      hasUser: !!user,
      sessionError: sessionError?.message,
      userError: userError?.message,
    };
    
  } catch (error) {
    console.error('❌ Auth Test Error:', error);
    return {
      hasSession: false,
      hasUser: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Test API call with detailed logging
 */
export async function testApiCall() {
  console.log('🌐 Testing API Call...');
  
  try {
    const response = await fetch('http://localhost:3000/api/v1/billing/subscriptions', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // We'll add auth header manually for testing
      },
    });
    
    console.log('📡 API Response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
    
    const responseText = await response.text();
    console.log('📄 Response Body:', responseText);
    
    return {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    };
    
  } catch (error) {
    console.error('❌ API Test Error:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
