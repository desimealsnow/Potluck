# Database Schema Capture

This directory contains scripts for capturing database schema snapshots from Supabase. These snapshots serve as **reference points** for understanding the database structure during development.

## Overview

The schema capture system provides:
- 📸 **Schema Snapshots**: Complete DDL of your database structure
- 📚 **Reference Documentation**: Easy-to-read database structure for development
- 🔄 **Automated Updates**: CI/CD integration for regular schema updates
- 📝 **Type Generation**: TypeScript types from database schema

## Files

- `capture_schema.mjs` - Node.js script (primary, cross-platform) ✅ **WORKING**
  - **Windows**: Auto-detects PostgreSQL installation paths
  - **Linux/macOS**: Uses `pg_dump` from PATH
  - **GitHub Actions**: Uses `pg_dump` from PATH (after installation)
- `capture_schema.sh` - Bash script for Unix/Linux/macOS (alternative)

## Quick Start

### Prerequisites

1. **Environment variables** (already set up):
   ```bash
   # These should already be in your .env file
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Required: For schema capture**:
   ```bash
   # Add to .env file for schema capture (IPv4-compatible pooler)
   SUPABASE_DB_URL=postgresql://postgres.your_project_ref:your_password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require
   ```
   
   **Note**: Use the Transaction pooler connection string from Supabase Dashboard (Settings → Database) for IPv4 compatibility.

### Usage

```bash
# Capture schema snapshot
npm run schema:capture

# Capture schema and generate TypeScript types
npm run schema:all

# Alternative bash version (if available)
npm run schema:capture:bash
```

## Output Structure

```
db/
├── schema.sql              # Current schema snapshot (main file)
├── schema.backup.sql       # Previous schema snapshot (backup file)
├── schema.json             # JSON schema for AI agents (main file)
└── schema.backup.json      # Previous JSON schema (backup file)

**File Rotation**: Each time the script runs:
1. Current `schema.sql` → `schema.backup.sql` (overwrites previous backup)
2. Current `schema.json` → `schema.backup.json` (overwrites previous backup)
3. New schema → `schema.sql` (becomes the new main file)
4. New JSON schema → `schema.json` (becomes the new main file)

src/types/
└── database.types.ts       # Generated TypeScript types
```

## What's Included

### SQL Schema (`schema.sql`)
The SQL schema snapshot includes:
- ✅ **Tables**: All table definitions with columns, types, constraints
- ✅ **Indexes**: All database indexes
- ✅ **Functions**: Custom database functions
- ✅ **Triggers**: Database triggers
- ✅ **RLS Policies**: Row Level Security policies
- ✅ **Views**: Database views
- ✅ **Enums**: Custom enum types
- ✅ **Sequences**: Auto-increment sequences

### JSON Schema (`schema.json`)
The JSON schema provides structured metadata perfect for AI agents:
- 📊 **Tables**: Complete table metadata with columns, types, constraints, foreign keys
- 🔧 **Functions**: Application functions with source code, arguments, return types
- ⚡ **Triggers**: Trigger definitions and their target tables
- 🗂️ **Views**: View definitions and source queries
- 🔗 **Relationships**: Foreign key mappings and table relationships
- 📈 **Indexes**: Index definitions and performance optimization data
- 🔒 **Policies**: RLS policies and security settings

**JSON Structure**:
```json
{
  "generated_at": "2025-09-19T18:04:10Z",
  "schemas": [
    {
      "schema": "public",
      "table": "events",
      "columns": [...],
      "primary_key": [...],
      "foreign_keys": [...],
      "indexes": [...],
      "policies": [...]
    }
  ],
  "functions": [
    {
      "schema": "public",
      "name": "process_join_request",
      "arguments": "uuid, uuid, integer, text, integer, boolean",
      "returns": "public.event_join_requests",
      "source": "DECLARE...",
      "volatility": "VOLATILE",
      "security": "SECURITY INVOKER"
    }
  ],
  "triggers": [...],
  "views": [...]
}
```

## Viewing and Working with JSON Schema Data

### Quick Commands to View JSON Data

#### 1. **Basic JSON Validation and Stats**
```bash
# Validate JSON and show statistics
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); console.log('✅ Valid JSON!'); console.log('Generated:', data.generated_at); console.log('Tables:', data.schemas.length); console.log('Functions:', data.functions.length); console.log('Triggers:', data.triggers.length); console.log('Views:', data.views.length);"
```

#### 2. **View Specific Data Sections**
```bash
# View all functions
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); console.log(JSON.stringify(data.functions, null, 2));"

# View all triggers
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); console.log(JSON.stringify(data.triggers, null, 2));"

# View all views
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); console.log(JSON.stringify(data.views, null, 2));"
```

#### 3. **Search for Specific Functions or Tables**
```bash
# Find a specific function (e.g., process_join_request)
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); const func = data.functions.find(f => f.name === 'process_join_request'); console.log(JSON.stringify(func, null, 2));"

# Find tables with specific patterns
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); const eventTables = data.schemas.filter(s => s.table.includes('event')); console.log(JSON.stringify(eventTables, null, 2));"
```

#### 4. **View Table Relationships**
```bash
# Show all foreign key relationships
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); data.schemas.forEach(table => { if (table.foreign_keys && table.foreign_keys.length > 0) { console.log(`${table.table} -> ${table.foreign_keys.map(fk => fk.references.table).join(', ')}`); } });"

# Show specific table's foreign keys
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); const table = data.schemas.find(s => s.table === 'events'); console.log('Foreign keys for events:', JSON.stringify(table.foreign_keys, null, 2));"
```

#### 5. **View Function Signatures**
```bash
# List all function signatures
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); data.functions.forEach(f => console.log(`${f.name}(${f.arguments}) -> ${f.returns}`));"

# View function source code
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('db/schema.json', 'utf8')); const func = data.functions.find(f => f.name === 'process_join_request'); console.log(func.source);"
```

#### 6. **PowerShell Commands (Windows)**
```powershell
# View file info
Get-ChildItem db\*.json | Select-Object Name, Length, LastWriteTime

# Search for specific content
Get-Content db\schema.json | Select-String -Pattern "process_join_request" -Context 3

# View last few lines
Get-Content db\schema.json | Select-Object -Last 10
```

#### 7. **Using jq (if installed)**
```bash
# Install jq first: https://stedolan.github.io/jq/
# Then use these commands:

# Show basic stats
jq '{generated_at, table_count: (.schemas | length), function_count: (.functions | length), trigger_count: (.triggers | length), view_count: (.views | length)}' db/schema.json

# List all function names
jq '.functions[].name' db/schema.json

# Show specific function
jq '.functions[] | select(.name == "process_join_request")' db/schema.json

# Show all tables with their column counts
jq '.schemas[] | {table: .table, column_count: (.columns | length)}' db/schema.json
```

### AI Agent Integration

The JSON schema is specifically designed for AI agents and provides:

- **Complete Function Metadata**: Source code, arguments, return types, volatility
- **Table Relationships**: Foreign keys, primary keys, indexes
- **Trigger Definitions**: Complete trigger logic and target tables
- **View Definitions**: Source queries for complex views
- **Security Information**: RLS policies and security settings

**Example AI Agent Usage**:
```javascript
// Load schema for AI agent
const schema = JSON.parse(fs.readFileSync('db/schema.json', 'utf8'));

// Find function to call
const processJoinRequest = schema.functions.find(f => f.name === 'process_join_request');
// Returns: { name, arguments, returns, source, volatility, security }

// Find table relationships
const eventsTable = schema.schemas.find(s => s.table === 'events');
const foreignKeys = eventsTable.foreign_keys;
// Returns: Array of foreign key relationships

// Get function source for analysis
const functionSource = processJoinRequest.source;
// Returns: Complete PL/pgSQL function body
```

## Schemas Captured

By default, the script captures:
- `public` - Your application tables, functions, triggers, views
- `auth` - Supabase authentication tables
- `storage` - Supabase storage tables

**Note**: Functions, triggers, and views are only captured from the `public` schema to focus on application-specific code.

To modify which schemas are captured, edit the `SCHEMAS` array in the capture scripts.

## CI/CD Integration

The GitHub Actions workflow automatically:
- Runs daily at 06:00 UTC
- Triggers when migration files change
- Captures schema and generates types
- Commits changes to the repository

### How the GitHub Workflow Works

The workflow (`.github/workflows/schema-sync.yml`) runs on Ubuntu and:

1. **Sets up Node.js environment**:
   ```bash
   # Uses actions/setup-node@v4 with Node.js 20
   # Caches npm dependencies for faster builds
   ```

2. **Installs dependencies**:
   ```bash
   npm ci
   ```

3. **Installs PostgreSQL client tools**:
   ```bash
   sudo apt-get update && sudo apt-get install -y postgresql-client
   ```

4. **Captures schema using Node.js script**:
   ```bash
   npm run schema:capture
   ```

5. **Generates TypeScript types**:
   ```bash
   npx supabase gen types typescript --db-url "$SUPABASE_DB_URL" > src/types/database.types.ts
   ```

6. **Commits changes automatically**:
   - Files: `db/schema.sql`, `db/schema.json`, `db/snapshots/**`, `src/types/database.types.ts`
   - Message: "chore(db): snapshot schema and types"

### Setting up CI/CD

1. **Add secret to GitHub**:
   - Go to Repository Settings > Secrets and Variables > Actions
   - Add `SUPABASE_DB_URL` with your database connection string
   - Use the Transaction pooler format: `postgresql://postgres.project_ref:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`

2. **Workflow triggers**:
   - **Manual dispatch**: Click "Run workflow" in GitHub Actions
   - **Daily at 06:00 UTC**: Automatic daily updates
   - **When `db/migrations/**` files change**: Automatic updates after migrations

3. **Workflow runs on**:
   - Ubuntu (latest)
   - Has write permissions to commit changes
   - Uses Node.js script for cross-platform compatibility
   - Auto-detects PostgreSQL installation paths

## Best Practices

### Development Workflow

1. **Before major changes**: Capture current schema
   ```bash
   npm run schema:capture
   ```

2. **After migrations**: Verify schema changes
   ```bash
   npm run schema:all
   git add db/schema.sql db/schema.json src/types/database.types.ts
   git commit -m "chore: update schema snapshot"
   ```

3. **Code reviews**: Use schema.sql and schema.json as reference for database structure
4. **AI development**: Use schema.json for AI agent database understanding

### Schema Management

- **Source of truth**: Keep migrations as your primary source
- **Schema snapshots**: Use for reference and documentation
- **Regular updates**: Let CI/CD handle automatic updates
- **Manual updates**: Run before major development sessions

## Troubleshooting

### Common Issues

1. **Connection errors**:
   ```
   Error: SUPABASE_DB_URL environment variable is not set
   ```
   - Solution: Set the `SUPABASE_DB_URL` environment variable

2. **pg_dump not found**:
   ```
   pg_dump: command not found
   ```
   - Solution: Install PostgreSQL client tools
   - Windows: Download from https://www.postgresql.org/download/windows/
   - macOS: `brew install postgresql`
   - Ubuntu/Debian: `sudo apt-get install postgresql-client`

3. **IPv6 connection errors**:
   ```
   pg_dump: error: could not translate host name "db.project.supabase.co" to address
   ```
   - Solution: Use Transaction pooler connection string (IPv4-compatible)
   - Format: `postgresql://postgres.project_ref:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require`

4. **File rotation errors**:
   ```
   Error: ENOENT: no such file or directory, rename 'schema.sql.tmp' -> 'schema.sql'
   ```
   - Solution: This has been fixed in the current version. Update to latest script.

5. **Permission errors**:
   ```
   pg_dump: error: connection to server at "..." failed
   ```
   - Solution: Verify connection string and database permissions

### Debug Mode

Run with verbose output:
```bash
# PowerShell
powershell -ExecutionPolicy Bypass -File scripts/capture_schema.ps1 -Verbose

# Bash
bash -x scripts/capture_schema.sh
```

## Advanced Usage

### Custom Schemas

To capture additional schemas, modify the scripts:

```bash
# In capture_schema.sh
SCHEMAS=("public" "auth" "storage" "functions" "custom_schema")
```

### Filtering Output

The scripts automatically clean output by removing:
- Comments (`-- ...`)
- SET statements (`SET ...`)

This ensures stable Git diffs and cleaner history.

### Manual Schema Diff

To compare local vs remote schema:
```bash
supabase db diff -f "live_diff_$(date +%Y%m%d%H%M).sql" --db-url "$SUPABASE_DB_URL"
```

## Security Notes

- ⚠️ **Never commit** `SUPABASE_DB_URL` to version control
- ✅ Store in local `.env` files and CI secrets only
- ✅ Use service role key with minimal required permissions
- ✅ Rotate database credentials regularly

## Integration with Validation Script

The schema capture works alongside the validation script:

1. **Schema capture**: Creates reference snapshots
2. **Validation script**: Ensures API schemas match database
3. **OpenAPI generation**: Creates runtime validation schemas

This three-layer approach provides:
- 📚 **Documentation** (schema snapshots)
- 🔍 **Validation** (API vs database consistency)
- 🛡️ **Runtime safety** (Zod schemas from OpenAPI)
