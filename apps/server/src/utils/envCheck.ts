/**
 * Environment Variables Check Utility
 * Helps debug missing environment variables
 */

export function checkEnvironmentVariables() {
  const requiredVars = [
    'LEMONSQUEEZY_API_KEY',
  ];

  const optionalVars = [
    'LEMONSQUEEZY_STORE_ID',
    'LEMONSQUEEZY_WEBHOOK_SECRET',
  ];

  console.log('🔍 Environment Variables Check:');
  console.log('================================');

  // Check required variables
  console.log('📋 Required Variables:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`❌ ${varName}: NOT SET`);
    }
  });

  // Check optional variables
  console.log('\n📋 Optional Variables:');
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`);
    } else {
      console.log(`⚠️  ${varName}: NOT SET (optional)`);
    }
  });

  // Check if LemonSqueezy is properly configured
  const hasApiKey = !!process.env.LEMONSQUEEZY_API_KEY;
  const hasStoreId = !!process.env.LEMONSQUEEZY_STORE_ID;
  
  console.log('\n🍋 LemonSqueezy Configuration:');
  console.log(`API Key: ${hasApiKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`Store ID: ${hasStoreId ? '✅ Set' : '⚠️  Not Set (test mode)'}`);
  
  if (hasApiKey && !hasStoreId) {
    console.log('ℹ️  Running in TEST MODE - Store ID not required');
  } else if (hasApiKey && hasStoreId) {
    console.log('ℹ️  Running in PRODUCTION MODE');
  } else {
    console.log('❌ LemonSqueezy not properly configured');
  }

  return {
    hasApiKey,
    hasStoreId,
    isConfigured: hasApiKey,
  };
}

