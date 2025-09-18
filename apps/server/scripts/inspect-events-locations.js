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
  // Fallback approach: fetch 1 row with *, infer keys
  const { data, error } = await sb.from(table).select('*').limit(1);
  if (error) return { error };
  const row = (data && data[0]) || {};
  const cols = Object.keys(row).map(k => ({ column_name: k }));
  return { data: cols };
}

async function countRows(table) {
  const { count, error } = await sb
    .from(table)
    .select('*', { count: 'exact', head: true });
  if (error) return { error };
  return { count: count ?? 0 };
}

async function main() {
  console.log('🔎 Inspecting public.events and public.locations...');

  const eventsCols = await listColumns('events');
  const locationsCols = await listColumns('locations');

  console.log('\n📋 events columns:');
  if (eventsCols.error) console.log('  (error)', eventsCols.error.message);
  else if (eventsCols.data.length === 0) console.log('  (no rows to infer)');
  else eventsCols.data.forEach(c => console.log(`  - ${c.column_name}`));

  console.log('\n📋 locations columns:');
  if (locationsCols.error) console.log('  (error)', locationsCols.error.message);
  else if (locationsCols.data.length === 0) console.log('  (no rows to infer)');
  else locationsCols.data.forEach(c => console.log(`  - ${c.column_name}`));

  const evHasLocationId = (eventsCols.data || []).some(c => c.column_name === 'location_id');
  const locHasId = (locationsCols.data || []).some(c => c.column_name === 'id');

  console.log('\n🔗 Key hints:');
  console.log(`  - events.location_id present: ${evHasLocationId ? 'yes' : 'no'}`);
  console.log(`  - locations.id present: ${locHasId ? 'yes' : 'no'}`);

  const evCount = await countRows('events');
  const locCount = await countRows('locations');
  console.log('\n#️⃣ Row counts:');
  console.log(`  - events: ${evCount.error ? '(error)' : evCount.count}`);
  console.log(`  - locations: ${locCount.error ? '(error)' : locCount.count}`);

  // Sample 1 event to see if location_id populated
  if (!evCount.error && evCount.count > 0 && evHasLocationId) {
    const { data, error } = await sb
      .from('events')
      .select('id, title, status, location_id')
      .limit(5);
    if (!error && data) {
      console.log('\n🧪 Sample events (id, status, location_id):');
      data.forEach(r => console.log(`  - ${r.id} | ${r.status} | ${r.location_id}`));
    }
  }

  console.log('\n✅ Inspection complete.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});


