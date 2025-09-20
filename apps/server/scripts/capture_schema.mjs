import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync, existsSync, unlinkSync, renameSync, readFileSync, statSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load envs
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), 'apps/server/.env') });
config({ path: resolve(process.cwd(), '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Config
const OUT_SQL = 'db/schema.sql';
const BACKUP_SQL = 'db/schema.backup.sql';
const OUT_JSON = 'db/schema.json';
const TMP_JSON_SQL = 'db/_schema_json_query.sql';
const SCHEMAS = ['public', 'auth', 'storage'];

function detectBin(name) {
  if (process.platform !== 'win32') return name;
  const candidates = [
    `C:\\Program Files\\PostgreSQL\\17\\bin\\${name}.exe`,
    `C:\\Program Files\\PostgreSQL\\16\\bin\\${name}.exe`,
    `C:\\Program Files\\PostgreSQL\\15\\bin\\${name}.exe`,
    name // fallback to PATH
  ];
  for (const p of candidates) {
    try {
      if (p === name || existsSync(p)) return p === name ? name : `"${p}"`;
    } catch {}
  }
  return name;
}

async function captureSchema() {
  console.log('🚀 Starting database schema capture…');
  if (!existsSync('db')) mkdirSync('db', { recursive: true });

  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    const match = process.env.SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) {
      const projectRef = match[1];
      console.error('❌ SUPABASE_DB_URL is required');
      console.log(`💡 Example:\nSUPABASE_DB_URL=postgresql://postgres:[password]@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`);
    } else {
      console.error('❌ SUPABASE_DB_URL is required (see Supabase Dashboard → Settings → Database).');
    }
    process.exit(1);
  }

  // 1) pg_dump → db/schema.sql
  try {
    const pgDump = detectBin('pg_dump');
    const tempFile = resolve(process.cwd(), OUT_SQL + '.tmp');
    const schemaArgs = SCHEMAS.map(s => `--schema=${s}`).join(' ');
    const cmd = `${pgDump} --schema-only --no-owner --no-privileges ${schemaArgs} --file "${tempFile}" "${dbUrl}"`;
    console.log('📊 Using pg_dump…');
    console.log('  Command:', cmd);
    const { stderr } = await execAsync(cmd);
    if (stderr && !/WARNING|INFO/.test(stderr)) throw new Error(stderr);

    if (!existsSync(tempFile) || !readFileSync(tempFile, 'utf8').trim()) {
      throw new Error('Schema file not created or empty');
    }
    if (existsSync(OUT_SQL)) {
      if (existsSync(BACKUP_SQL)) unlinkSync(BACKUP_SQL);
      renameSync(OUT_SQL, BACKUP_SQL);
    }
    renameSync(tempFile, OUT_SQL);

    const stats = statSync(OUT_SQL);
    console.log(`✅ SQL schema saved to ${OUT_SQL} (${Math.round(stats.size / 1024)} KB)`);
    if (existsSync(BACKUP_SQL)) console.log(`📦 Backup: ${BACKUP_SQL}`);
  } catch (e) {
    console.error('❌ pg_dump failed:', e);
    process.exit(1);
  }

  // 2) psql → db/schema.json (agent-friendly catalog)
  try {
    const psql = detectBin('psql');
    const schemaArrayLiteral = SCHEMAS.map(s => `'${s}'`).join(',');
    const sql = `
WITH rels AS (
  SELECT c.oid,
         n.nspname  AS schema,
         c.relname  AS table,
         obj_description(c.oid,'pg_class') AS comment
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind IN ('r','p') AND n.nspname = ANY(ARRAY[${schemaArrayLiteral}]::text[])
),
cols AS (
  SELECT a.attrelid AS oid, a.attnum,
         a.attname AS name,
         format_type(a.atttypid, a.atttypmod) AS type,
         NOT a.attnotnull AS nullable,
         pg_get_expr(ad.adbin, ad.adrelid) AS "default",
         col_description(a.attrelid, a.attnum) AS comment
  FROM pg_attribute a
  LEFT JOIN pg_attrdef ad ON ad.adrelid=a.attrelid AND ad.adnum=a.attnum
  WHERE a.attnum > 0 AND NOT a.attisdropped
),
pks AS (
  SELECT x.indrelid AS oid,
         jsonb_agg(att.attname ORDER BY ord) AS pk_cols
  FROM (
    SELECT indrelid, indkey, generate_subscripts(indkey,1) AS ord
    FROM pg_index WHERE indisprimary
  ) x
  JOIN pg_attribute att ON att.attrelid=x.indrelid AND att.attnum = x.indkey[x.ord]
  JOIN pg_class c ON c.oid = x.indrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = ANY(ARRAY[${schemaArrayLiteral}]::text[])
  GROUP BY x.indrelid
),
fks AS (
  SELECT con.conrelid AS oid,
         jsonb_agg(
           jsonb_build_object(
             'name', con.conname,
             'columns', (SELECT jsonb_agg(a.attname ORDER BY i)
                         FROM unnest(con.conkey) WITH ORDINALITY k(attnum,i)
                         JOIN pg_attribute a ON a.attrelid=con.conrelid AND a.attnum=k.attnum),
             'references', jsonb_build_object(
               'schema', nr.nspname,
               'table',  cr.relname,
               'columns', (SELECT jsonb_agg(a2.attname ORDER BY i)
                           FROM unnest(con.confkey) WITH ORDINALITY k2(attnum,i)
                           JOIN pg_attribute a2 ON a2.attrelid=con.confrelid AND a2.attnum=k2.attnum)
             ),
             'update', con.confupdtype::text,
             'delete', con.confdeltype::text
           )
         ) AS fks
  FROM pg_constraint con
  JOIN pg_class    ct ON ct.oid=con.conrelid
  JOIN pg_namespace nt ON nt.oid=ct.relnamespace
  JOIN pg_class    cr ON cr.oid=con.confrelid
  JOIN pg_namespace nr ON nr.oid=cr.relnamespace
  WHERE con.contype='f'
    AND nt.nspname = ANY(ARRAY[${schemaArrayLiteral}]::text[])
  GROUP BY con.conrelid
),
idx AS (
  SELECT c.oid,
         jsonb_agg(jsonb_build_object('name', i.relname, 'def', pg_get_indexdef(i.oid)) ORDER BY i.oid) AS indexes
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  JOIN pg_index ix ON ix.indrelid=c.oid
  JOIN pg_class i ON i.oid=ix.indexrelid
  WHERE n.nspname = ANY(ARRAY[${schemaArrayLiteral}]::text[])
  GROUP BY c.oid
),
pol AS (
  SELECT c.oid,
         jsonb_agg(jsonb_build_object(
           'name', p.policyname, 'cmd', p.cmd, 'roles', p.roles,
           'using', p.qual,
           'check', p.with_check
         ) ORDER BY p.policyname) AS policies
  FROM pg_policies p
  JOIN pg_class c ON c.relname = p.tablename
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = p.schemaname
  WHERE n.nspname = ANY(ARRAY[${schemaArrayLiteral}]::text[])
  GROUP BY c.oid
),
funcs AS (
  SELECT n.nspname AS schema,
         p.proname AS name,
         pg_get_function_identity_arguments(p.oid) AS arguments,
         pg_get_function_result(p.oid) AS returns,
         p.prosrc AS source,
         obj_description(p.oid, 'pg_proc') AS comment,
         CASE p.provolatile 
           WHEN 'i' THEN 'IMMUTABLE'
           WHEN 's' THEN 'STABLE' 
           WHEN 'v' THEN 'VOLATILE'
         END AS volatility,
         CASE p.prosecdef WHEN true THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'  -- only functions from public schema
    AND p.prokind = 'f'  -- functions only, not procedures
    AND (p.proname LIKE '%event%' OR p.proname LIKE '%join%' OR p.proname LIKE '%user%' 
         OR p.proname LIKE '%create%' OR p.proname LIKE '%expire%' OR p.proname LIKE '%find%' 
         OR p.proname LIKE '%process%' OR p.proname LIKE '%update%' OR p.proname LIKE '%availability%'
         OR p.proname LIKE '%request%' OR p.proname LIKE '%status%' OR p.proname LIKE '%location%'
         OR p.proname LIKE '%trg_%')  -- only capture application-specific functions
    AND p.proname NOT LIKE '_postgis_%'  -- exclude PostGIS internal functions
    AND p.proname NOT LIKE 'st_%'  -- exclude PostGIS ST functions
    AND p.proname NOT LIKE 'gserialized_%'  -- exclude PostGIS functions
    AND p.proname NOT LIKE 'updategeometrysrid'  -- exclude PostGIS functions
    AND p.proname NOT LIKE 'find_srid'  -- exclude PostGIS functions
),
triggers AS (
  SELECT n.nspname AS schema,
         c.relname AS table_name,
         t.tgname AS name,
         pg_get_triggerdef(t.oid) AS definition,
         obj_description(t.oid, 'pg_trigger') AS comment
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'  -- only triggers from public schema
    AND NOT t.tgisinternal
),
views AS (
  SELECT n.nspname AS schema,
         c.relname AS name,
         pg_get_viewdef(c.oid, true) AS definition,
         obj_description(c.oid, 'pg_class') AS comment
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'v'
    AND n.nspname = 'public'  -- only views from public schema
)
SELECT jsonb_pretty(
  jsonb_build_object(
    'generated_at', to_char(now(),'YYYY-MM-DD\"T\"HH24:MI:SSZ'),
    'schemas', jsonb_agg(
      jsonb_build_object(
        'schema', r.schema,
        'table',  r.table,
        'comment', r.comment,
        'columns', (SELECT jsonb_agg(
                      jsonb_build_object('name', c.name, 'type', c.type, 'nullable', c.nullable, 'default', c."default", 'comment', c.comment)
                      ORDER BY c.attnum)
                    FROM cols c WHERE c.oid=r.oid),
        'primary_key', coalesce((SELECT pk_cols FROM pks WHERE oid=r.oid), '[]'::jsonb),
        'foreign_keys', coalesce((SELECT fks FROM fks WHERE oid=r.oid), '[]'::jsonb),
        'indexes',      coalesce((SELECT indexes FROM idx WHERE oid=r.oid), '[]'::jsonb),
        'policies',     coalesce((SELECT policies FROM pol WHERE oid=r.oid), '[]'::jsonb)
      ) ORDER BY r.schema, r.table
    ),
    'functions', (SELECT jsonb_agg(
      jsonb_build_object(
        'schema', f.schema,
        'name', f.name,
        'arguments', f.arguments,
        'returns', f.returns,
        'source', f.source,
        'comment', f.comment,
        'volatility', f.volatility,
        'security', f.security
      ) ORDER BY f.schema, f.name
    ) FROM funcs f),
    'triggers', (SELECT jsonb_agg(
      jsonb_build_object(
        'schema', t.schema,
        'table', t.table_name,
        'name', t.name,
        'definition', t.definition,
        'comment', t.comment
      ) ORDER BY t.schema, t.table_name, t.name
    ) FROM triggers t),
    'views', (SELECT jsonb_agg(
      jsonb_build_object(
        'schema', v.schema,
        'name', v.name,
        'definition', v.definition,
        'comment', v.comment
      ) ORDER BY v.schema, v.name
    ) FROM views v)
  )
)
FROM rels r;
`;
    writeFileSync(TMP_JSON_SQL, sql, 'utf8');

    const cmd = `${psql} "${dbUrl}" -X -q -t -A -v ON_ERROR_STOP=1 -f "${TMP_JSON_SQL}" -o "${OUT_JSON}"`;
    console.log('🧾 Generating JSON schema via psql…');
    console.log('  Command:', cmd);
    const { stderr } = await execAsync(cmd);
    if (stderr && !/WARNING|INFO/.test(stderr)) throw new Error(stderr);

    if (!existsSync(OUT_JSON) || !readFileSync(OUT_JSON, 'utf8').trim()) {
      throw new Error('JSON schema was not created or is empty');
    }
    console.log(`✅ JSON schema saved to ${OUT_JSON}`);
    
    // Clean up temporary SQL file
    if (existsSync(TMP_JSON_SQL)) {
      unlinkSync(TMP_JSON_SQL);
    }
  } catch (e) {
    console.error('❌ JSON generation failed:', e);
    // Clean up temporary SQL file on error
    if (existsSync(TMP_JSON_SQL)) {
      unlinkSync(TMP_JSON_SQL);
    }
    process.exit(1);
  }

  console.log('\n🎉 Done: captured SQL + JSON schema snapshots.');
}

captureSchema().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
