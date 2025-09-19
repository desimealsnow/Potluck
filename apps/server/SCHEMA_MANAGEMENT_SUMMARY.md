# Schema Management Summary

This document provides an overview of the complete schema management system implemented for the Potluck application.

## 🏗️ Architecture Overview

The schema management system follows a **three-layer approach**:

1. **📋 OpenAPI Specification** (`docs/api-spec.yaml`) - Single source of truth for API contracts
2. **🛡️ Runtime Validation** (`src/validators.ts`) - Generated from OpenAPI using `openapi-zod-client`
3. **📚 Database Reference** (`db/schema.sql`) - Snapshot of actual database structure

## 🔄 Workflow

### Primary Workflow (API-First)
```bash
# 1. Update OpenAPI spec when changing API
# 2. Generate Zod schemas from OpenAPI
npm run schema:generate

# 3. Validate database consistency (safety check)
npm run schema:check
```

### Secondary Workflow (Database Reference)
```bash
# 4. Capture database schema snapshot (reference) ✅ WORKING
npm run schema:capture

# 5. Generate TypeScript types from database
npm run schema:types

# 6. Do both together
npm run schema:all
```

**Status**: ✅ **Schema capture is fully functional** - No additional setup required!

## 📁 File Structure

```
apps/server/
├── docs/
│   └── api-spec.yaml              # OpenAPI specification (source of truth)
├── src/
│   ├── validators.ts              # Generated Zod schemas (from OpenAPI)
│   └── types/
│       └── database.types.ts      # Generated TypeScript types (from DB)
├── db/
│   ├── schema.sql                 # Latest database snapshot
│   ├── snapshots/                 # Historical snapshots
│   └── migrations/                # Database migrations
├── scripts/
│   ├── validate-schema.mjs        # Database vs API validation
│   ├── capture_schema.ps1         # Schema capture (Windows)
│   ├── capture_schema.sh          # Schema capture (Unix/Linux)
│   └── capture_schema.bat         # Schema capture (Windows fallback)
└── .github/workflows/
    └── schema-sync.yml            # Automated schema updates
```

## 🛠️ Available Commands

### API Schema Management
```bash
npm run schema:generate            # Generate validators.ts from OpenAPI
npm run schema:check               # Validate database vs API schemas
npm run schema:validate            # Basic validation
```

### Database Reference Management
```bash
npm run schema:capture             # Capture complete schema using Supabase CLI
npm run schema:capture:bash        # Capture using Bash script (alternative)
npm run schema:types               # Generate TypeScript types from DB
npm run schema:all                 # Capture schema + generate types
```

**Requirements**: `SUPABASE_DB_URL` must be set in `.env` file

## 🎯 Use Cases

### For API Development
- **Update API**: Modify `docs/api-spec.yaml`
- **Generate schemas**: Run `npm run schema:generate`
- **Validate consistency**: Run `npm run schema:check`

### For Database Development
- **Reference structure**: Check `db/schema.sql` for current DB structure
- **Capture changes**: Run `npm run schema:capture` after migrations
- **Type safety**: Use `src/types/database.types.ts` for TypeScript types

### For Code Reviews
- **API changes**: Review OpenAPI spec changes
- **Database changes**: Review `db/schema.sql` changes
- **Validation reports**: Check validation results in `schema-validation-results/`

## 🔧 Configuration

### Environment Variables
```bash
# Required for API schema generation
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for database schema capture
SUPABASE_DB_URL=postgresql://postgres:password@host:6543/postgres?sslmode=require
```

### CI/CD Setup
1. Add `SUPABASE_DB_URL` to GitHub Secrets
2. Workflow runs automatically:
   - Daily at 06:00 UTC
   - When migration files change
   - Manual dispatch

## 📊 Benefits

### API-First Approach
- ✅ **Type Safety**: Client and server use identical schemas
- ✅ **Single Source of Truth**: OpenAPI spec is authoritative
- ✅ **Industry Standard**: Follows best practices
- ✅ **Maintainable**: Changes flow from spec → schemas → implementation

### Database Reference
- ✅ **Documentation**: Easy-to-read database structure
- ✅ **Version Control**: Track database changes over time
- ✅ **Code Reviews**: Reference for understanding DB structure
- ✅ **Type Generation**: TypeScript types from actual database

### Validation Layer
- ✅ **Safety Check**: Ensures database matches API expectations
- ✅ **Early Detection**: Catch inconsistencies before deployment
- ✅ **Automated**: CI/CD integration for continuous validation

## 🚀 Getting Started

1. **Set up environment variables**:
   ```bash
   export SUPABASE_DB_URL="postgresql://postgres:password@host:6543/postgres?sslmode=require"
   ```

2. **Generate initial schemas**:
   ```bash
   npm run schema:generate
   npm run schema:capture
   ```

3. **Validate everything**:
   ```bash
   npm run schema:check
   ```

4. **Commit to version control**:
   ```bash
   git add db/schema.sql src/validators.ts src/types/database.types.ts
   git commit -m "chore: initial schema setup"
   ```

## 📚 Documentation

- **Schema Validation**: `scripts/SCHEMA_VALIDATION_README.md`
- **Schema Capture**: `scripts/SCHEMA_CAPTURE_README.md`
- **API Specification**: `docs/api-spec.yaml`

## 🔄 Maintenance

### Regular Tasks
- **Daily**: CI/CD automatically updates schema snapshots
- **Before releases**: Run `npm run schema:all` to ensure everything is up to date
- **After migrations**: Verify schema changes with `npm run schema:check`

### Troubleshooting
- **Connection issues**: Check environment variables
- **Permission errors**: Verify database access
- **Schema mismatches**: Review validation reports
- **Generation failures**: Check OpenAPI spec validity

This comprehensive schema management system ensures consistency, type safety, and maintainability across your entire application stack.
