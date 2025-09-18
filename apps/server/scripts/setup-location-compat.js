/*
  Setup script: Inspect DB for location profile compatibility
  - Detects presence of tables: public.user_profiles, public.profiles, public.user_preferences
  - Lists available columns relevant to location discovery
  - If user_profiles is missing but profiles exists, prints a SQL compatibility view you can apply

  Usage:
    node scripts/setup-location-compat.js
*/

/* eslint-disable no-console */
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env (.env.test preferred, then .env)
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
  console.error('❌ Missing TEST_SUPABASE_URL/TEST_SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)');
  process.exit(1);
}

const sb = createClient(DB_URL, DB_KEY);

async function tableExists(table) {
  // Use information_schema.tables which is exposed by PostgREST
  const { data, error } = await sb
    .from('information_schema.tables')
    .select('table_schema, table_name')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .limit(1);
  if (error) return false;
  return (data || []).length > 0;
}

async function listColumns(table) {
  // information_schema.columns is accessible via PostgREST as a view
  const { data, error } = await sb
    .from('information_schema.columns')
    .select('column_name, data_type')
    .eq('table_schema', 'public')
    .eq('table_name', table)
    .order('column_name');
  if (error) return [];
  return data || [];
}

function hasColumn(columns, name) {
  return columns.some(c => (c.column_name || '').toLowerCase() === name.toLowerCase());
}

async function main() {
  console.log('🔎 Inspecting public schema for location discovery compatibility...');

  const targets = ['user_profiles', 'profiles', 'user_preferences'];
  const existence = {};
  for (const t of targets) {
    existence[t] = await tableExists(t);
  }

  console.log('\n📋 Table existence:');
  for (const t of targets) {
    console.log(`- ${t}: ${existence[t] ? '✅ present' : '❌ missing'}`);
  }

  const relevant = existence.user_profiles
    ? 'user_profiles'
    : existence.profiles
      ? 'profiles'
      : existence.user_preferences
        ? 'user_preferences'
        : null;

  if (!relevant) {
    console.log('\n❌ None of user_profiles/profiles/user_preferences found in public schema.');
    console.log('   Apply your migrations (e.g., 005_location_discovery.sql) and re-run.');
    process.exit(1);
  }

  const cols = await listColumns(relevant);
  console.log(`\n🧭 Using candidate table: ${relevant}`);
  console.log('   Columns:');
  cols.forEach(c => console.log(`   - ${c.column_name} (${c.data_type})`));

  // Desired columns for location discovery
  const desired = [
    'user_id',
    'home_geog',
    'discoverability_enabled',
    'discoverability_radius_km',
    'city',
    'geo_precision'
  ];

  const present = Object.fromEntries(desired.map(d => [d, hasColumn(cols, d)]));
  console.log('\n🔩 Desired columns presence:');
  for (const k of desired) {
    console.log(`   ${k}: ${present[k] ? '✅' : '⚠️ missing'}`);
  }

  // If user_profiles already exists, we are good
  if (relevant === 'user_profiles') {
    console.log('\n✅ public.user_profiles exists. You can proceed to run location tests.');
    return;
  }

  // If profiles exists, propose a compatibility view
  if (relevant === 'profiles' || relevant === 'user_preferences') {
    // Identify primary id column name (id or user_id)
    const hasId = hasColumn(cols, 'id');
    const hasUserId = hasColumn(cols, 'user_id');
    const idExpr = hasUserId ? 'user_id' : hasId ? 'id' : null;

    if (!idExpr) {
      console.log(`\n❌ Could not find an id column on ${relevant} to map as user_id.`);
      process.exit(1);
    }

    console.log(`\n🛠️ Suggested compatibility view to reuse public.${relevant} as public.user_profiles:`);
    const sql = `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    CREATE VIEW public.user_profiles AS
    SELECT
      ${idExpr}::uuid AS user_id,
      ${present.home_geog ? 'home_geog' : 'NULL::geography(Point,4326) AS home_geog'},
      ${present.discoverability_enabled ? 'discoverability_enabled' : 'TRUE AS discoverability_enabled'},
      ${present.discoverability_radius_km ? 'discoverability_radius_km' : '25 AS discoverability_radius_km'},
      ${present.city ? 'city' : 'NULL::text AS city'},
      ${present.geo_precision ? 'geo_precision' : "'city'::text AS geo_precision"}
    FROM public.${relevant};
  END IF;
END $$;`;
    console.log('\n----- BEGIN SQL -----');
    console.log(sql);
    console.log('----- END SQL -----\n');

    console.log('ℹ️ Apply the above SQL in Supabase SQL editor (or psql) to create the compatibility view.');
    console.log('   After that, re-run the location tests.');
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});


