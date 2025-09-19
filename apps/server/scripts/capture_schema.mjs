import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync, existsSync, unlinkSync, renameSync, readFileSync, statSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Load environment variables from multiple locations (same as check-host-profile.mjs)
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), 'apps/server/.env') });
config({ path: resolve(process.cwd(), '../../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  console.error('Set them in your environment or .env file');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Configuration
const OUT_FILE = 'db/schema.sql';
const BACKUP_FILE = 'db/schema.backup.sql';
const SCHEMAS = ['public', 'auth', 'storage'];

// Using Supabase CLI directly - no need for custom table discovery functions

async function captureSchema() {
  console.log('🚀 Starting database schema capture...');
  console.log('📡 Supabase URL:', SUPABASE_URL);
  console.log('📋 Schemas to capture:', SCHEMAS.join(', '));
  console.log('');

  // Create directories
  if (!existsSync('db')) {
    mkdirSync('db', { recursive: true });
  }

  try {
    // Check if SUPABASE_DB_URL is available
    const dbUrl = process.env.SUPABASE_DB_URL;
    
    if (!dbUrl) {
      // Try to construct database URL from Supabase URL
      const supabaseUrl = process.env.SUPABASE_URL;
      if (supabaseUrl) {
        // Extract project ref from Supabase URL
        const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
        if (match) {
          const projectRef = match[1];
          console.log('🔧 Attempting to construct database URL from Supabase URL...');
          console.log(`📡 Detected project: ${projectRef}`);
          
          // Try to construct the database URL
          const constructedUrl = `postgresql://postgres:[password]@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`;
          console.log('⚠️  SUPABASE_DB_URL not found, but detected Supabase project');
          console.log('');
          console.log('💡 To set up SUPABASE_DB_URL:');
          console.log('  1. Go to Supabase Dashboard > Settings > Database');
          console.log('  2. Copy the "Connection string" under "Connection parameters"');
          console.log('  3. Add it to your .env file:');
          console.log(`     SUPABASE_DB_URL=${constructedUrl}`);
          console.log('  4. Replace [password] with your actual database password');
          console.log('');
          console.log('💡 Alternative: Use the shell script version:');
          console.log('  npm run schema:capture:bash');
          process.exit(1);
        }
      }
      
      console.error('❌ SUPABASE_DB_URL is required for schema capture');
      console.log('');
      console.log('💡 To set up SUPABASE_DB_URL:');
      console.log('  1. Go to Supabase Dashboard > Settings > Database');
      console.log('  2. Copy the "Connection string" under "Connection parameters"');
      console.log('  3. Add it to your .env file:');
      console.log('     SUPABASE_DB_URL=postgresql://postgres:password@host:6543/postgres?sslmode=require');
      console.log('');
      console.log('💡 Alternative: Use the shell script version:');
      console.log('  npm run schema:capture:bash');
      process.exit(1);
    }

    console.log('📊 Using pg_dump for complete schema capture...');
    
    // Use pg_dump directly (more reliable than Supabase CLI on Windows)
    const tempFile = resolve(process.cwd(), OUT_FILE + '.tmp');
    const schemaArgs = SCHEMAS.map(schema => `--schema=${schema}`).join(' ');
    // Use pg_dump with platform-specific path detection
    let pgDumpPath = 'pg_dump'; // Default for Unix/Linux/macOS
    
    if (process.platform === 'win32') {
      // Try common PostgreSQL installation paths on Windows
      const possiblePaths = [
        'C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe',
        'C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe',
        'pg_dump' // Fallback to PATH
      ];
      
      // Find the first available pg_dump executable
      for (const path of possiblePaths) {
        try {
          if (path === 'pg_dump' || existsSync(path)) {
            pgDumpPath = path === 'pg_dump' ? 'pg_dump' : `"${path}"`;
            break;
          }
        } catch (error) {
          // Continue to next path
        }
      }
    }
    const pgDumpCommand = `${pgDumpPath} --schema-only --no-owner --no-privileges ${schemaArgs} --file "${tempFile}" "${dbUrl}"`;
    
    console.log('  🔧 Executing pg_dump...');
    console.log(`  Command: ${pgDumpCommand}`);
    
    const { stdout, stderr } = await execAsync(pgDumpCommand);
    
    if (stderr && !stderr.includes('WARNING') && !stderr.includes('INFO')) {
      console.error('❌ pg_dump error:', stderr);
      throw new Error(`pg_dump failed: ${stderr}`);
    }

    // Check if temp file was created and has content
    if (!existsSync(tempFile)) {
      throw new Error('Schema file was not created');
    }

    const tempContent = readFileSync(tempFile, 'utf8');
    if (!tempContent.trim()) {
      throw new Error('Schema file is empty');
    }

    // Move current schema to backup if it exists
    if (existsSync(OUT_FILE)) {
      console.log('  📁 Moving current schema to backup...');
      if (existsSync(BACKUP_FILE)) {
        unlinkSync(BACKUP_FILE); // Remove old backup
      }
      renameSync(OUT_FILE, BACKUP_FILE);
    }

    // Move temp file to final location
    console.log('  📝 Writing new schema file...');
    renameSync(tempFile, OUT_FILE);

    // Get file size for reporting
    const stats = statSync(OUT_FILE);
    const fileSizeKB = Math.round(stats.size / 1024);

    console.log('✅ Schema capture completed successfully!');
    console.log(`📄 Schema saved to: ${OUT_FILE}`);
    console.log(`📄 Backup saved to: ${BACKUP_FILE}`);
    console.log(`📊 File size: ${fileSizeKB} KB`);
    console.log('  🎯 Captured: Tables, Functions, Triggers, Indexes, Enums, Sequences, Policies');

    console.log(`✅ Complete schema captured to ${OUT_FILE}`);
    console.log('');
    console.log('📊 Summary:');
    console.log(`  📁 Main file: ${OUT_FILE}`);
    console.log(`  📦 Backup file: ${BACKUP_FILE}`);
    console.log('  🎯 Captured: Tables, Functions, Triggers, Indexes, Enums, Sequences, Policies');

  } catch (error) {
    console.error('❌ Schema capture failed:', error);
    console.log('');
    console.log('💡 Troubleshooting:');
    console.log('  1. Install PostgreSQL client tools:');
    console.log('     - Windows: Download from https://www.postgresql.org/download/windows/');
    console.log('     - macOS: brew install postgresql');
    console.log('     - Ubuntu/Debian: sudo apt-get install postgresql-client');
    console.log('  2. Check SUPABASE_DB_URL is correct');
    console.log('  3. Verify database connection');
    console.log('  4. Try: npm run schema:capture:bash (uses shell script)');
    process.exit(1);
  }
}

// Using Supabase CLI directly - no need for custom SQL generation

// Run the script
captureSchema().catch(err => {
  console.error('❌ Script failed:', err);
  process.exit(1);
});
