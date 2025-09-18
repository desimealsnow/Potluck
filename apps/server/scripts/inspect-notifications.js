/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env (.env.test preferred)
const envTest = path.resolve(__dirname, '../.env.test');
const envDefault = path.resolve(__dirname, '../.env');
if (fs.existsSync(envTest)) {
  require('dotenv').config({ path: envTest });
} else if (fs.existsSync(envDefault)) {
  require('dotenv').config({ path: envDefault });
} else {
  require('dotenv').config();
}

const DB_URL = process.env.TEST_SUPABASE_URL || process.env.SUPABASE_URL;
const DB_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DB_URL || !DB_KEY) {
  console.error('❌ Missing TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const sb = createClient(DB_URL, DB_KEY);

async function listColumns(table) {
  // Prefer information_schema.columns via PostgREST
  const info = await sb
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .order('ordinal_position');
  if (!info.error && Array.isArray(info.data)) return { data: info.data };
  // Fallback: fetch 1 row and infer keys
  const probe = await sb.from(table).select('*').limit(1);
  if (probe.error) return { error: probe.error };
  const row = (probe.data && probe.data[0]) || {};
  const cols = Object.keys(row).map(k => ({ column_name: k }));
  return { data: cols };
}

async function main() {
  console.log('🔎 Inspecting public.notifications...');

  const cols = await listColumns('notifications');
  console.log('\n📋 notifications columns:');
  if (cols.error) console.log('  (error)', cols.error.message);
  else if (!cols.data || cols.data.length === 0) console.log('  (no rows to infer)');
  else cols.data.forEach(c => console.log(`  - ${c.column_name}`));

  const colNames = (cols.data || []).map(c => c.column_name);
  console.log('\n🔗 Expected columns present:');
  ['id','user_id','type','event_id','payload','read_at','created_at','updated_at'].forEach(name => {
    console.log(`  - ${name}: ${colNames.includes(name) ? 'yes' : 'no'}`);
  });

  if (!colNames.includes('event_id')) {
    console.log('\n❗ Missing event_id column detected. If you recently applied migrations, reload PostgREST schema:');
    console.log("   SELECT pg_notify('pgrst', 'reload schema');");
  }

  console.log('\n✅ Inspection complete.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});


