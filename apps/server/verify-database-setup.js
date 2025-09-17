const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function verifySetup() {
  console.log('🔍 Verifying LemonSqueezy database setup...\n');

  // Check external_id column exists
  const { data: testData, error: testError } = await supabase
    .from('billing_plans')
    .select('external_id')
    .limit(1);
  
  if (testError && testError.message.includes('external_id')) {
    console.log('❌ external_id column missing - run the SQL setup first');
    return;
  }
  console.log('✅ external_id column exists');

  // Check current plans and mappings
  const { data: plans } = await supabase
    .from('billing_plans')
    .select('id, name, external_id, provider')
    .order('name');

  console.log('\n📊 Current billing_plans:');
  plans.forEach(plan => {
    const status = plan.external_id ? '✅' : '❌';
    console.log(`  ${status} ${plan.name}: ${plan.external_id || 'NO EXTERNAL_ID'} (${plan.provider || 'NO PROVIDER'})`);
  });

  // Test variant mapping
  const variantMapping = {};
  plans.filter(p => p.external_id && p.provider === 'lemonsqueezy').forEach(plan => {
    variantMapping[plan.external_id] = plan.id;
  });

  console.log('\n🔗 Generated variant mapping:', JSON.stringify(variantMapping, null, 2));
  
  const testVariants = ['992413', '992415'];
  testVariants.forEach(variant => {
    const planId = variantMapping[variant];
    console.log(`${planId ? '✅' : '❌'} Variant ${variant} -> ${planId || 'NO MAPPING'}`);
  });

  // Check recent subscriptions
  console.log('\n📋 Recent LemonSqueezy subscriptions:');
  const { data: subscriptions } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, plan_id, status, created_at')
    .eq('provider', 'lemonsqueezy')
    .order('created_at', { ascending: false })
    .limit(3);

  if (subscriptions && subscriptions.length > 0) {
    subscriptions.forEach(sub => {
      console.log(`  ${sub.id}: ${sub.status} (${sub.created_at})`);
    });
  } else {
    console.log('  No LemonSqueezy subscriptions found');
  }

  // Check recent invoices
  console.log('\n💰 Recent LemonSqueezy invoices:');
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, user_id, amount_cents, currency, status, issued_at')
    .eq('provider', 'lemonsqueezy')
    .order('issued_at', { ascending: false })
    .limit(3);

  if (invoices && invoices.length > 0) {
    invoices.forEach(inv => {
      console.log(`  ${inv.id}: ${inv.amount_cents/100} ${inv.currency.toUpperCase()} - ${inv.status} (${inv.issued_at})`);
    });
  } else {
    console.log('  No LemonSqueezy invoices found');
  }

  console.log('\n🎉 Database verification complete!');
}

verifySetup().catch(console.error);
