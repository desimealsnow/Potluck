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

  // CLI args
  const args = process.argv.slice(2);
  const arg = {};
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k.startsWith('--')) {
      const key = k.slice(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true';
      arg[key] = val;
    }
  }

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

  // Optional: Nearby filter using PostGIS geography
  if (arg.lat && arg.lon) {
    const lat = parseFloat(arg.lat);
    const lon = parseFloat(arg.lon);
    const radiusKm = parseFloat(arg.radius || '25');
    const limit = parseInt(arg.limit || '25', 10);
    const onlyPublished = (String(arg.status || '').toLowerCase() === 'published');
    const onlyPublic = String(arg.public || 'true') === 'true';

    console.log(`\n📍 Nearby query: lat=${lat}, lon=${lon}, radius_km=${radiusKm}`);

    // Try events.location_geog first; fallback to events.event_geog
    const withGeog = async (col) => {
      return sb.rpc('exec_sql', {
        // Using RPC requires a helper; fallback: use from/select with filter columns
      });
    };

    // Using from/select with ST_DWithin on geography columns
    const runQuery = async (geogColumn) => {
      // Supabase-js cannot express ST_DWithin directly in query builder; use RPC or raw
      // Here we use a REST filter via PostgREST: embed raw SQL is not supported, so use supabase-js .rpc with a SQL function
      // If you don't have a generic exec_sql RPC, fallback to two attempts via select() with computed columns
      const sql = `
        SELECT id, title, event_date, city,
               ROUND(ST_Distance(${geogColumn}, ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography) / 1000.0, 2) AS distance_km
        FROM public.events
        WHERE ${onlyPublished ? "status = 'published' AND " : ''}${onlyPublic ? 'is_public = TRUE AND ' : ''}${geogColumn} IS NOT NULL
          AND ST_DWithin(
                ${geogColumn},
                ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
                ${radiusKm} * 1000
              )
        ORDER BY event_date DESC
        LIMIT ${limit};
      `;

      // Try a lightweight exec using Node pg if available via DATABASE_URL
      const dbUrl = process.env.DATABASE_URL;
      if (dbUrl) {
        try {
          const { Client } = require('pg');
          const client = new Client({ connectionString: dbUrl });
          await client.connect();
          const r = await client.query(sql);
          await client.end();
          return r.rows;
        } catch (e) {
          console.log('⚠️ pg direct query failed, falling back to approximation:', e.message);
        }
      }
      console.log('⚠️ Skipping raw SQL (no DATABASE_URL). You can run this SQL manually:\n' + sql);
      return [];
    };

    let rows = await runQuery('location_geog');
    if (!rows || rows.length === 0) {
      rows = await runQuery('event_geog');
    }
    console.log(`\n📈 Nearby results: ${rows.length} row(s)`);
    rows.slice(0, 25).forEach(r => {
      console.log('-', r.id, r.title, r.event_date, `${r.distance_km}km`, r.city || '');
    });
  }

  console.log('\n✅ Inspection complete.');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});


