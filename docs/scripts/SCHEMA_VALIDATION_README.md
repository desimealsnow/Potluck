# Database Schema Validation Script

This script validates that your database schema is consistent with your API schemas. It's designed as a **safety check** to ensure database constraints match your API expectations.

## API-First Approach

This project follows an **API-first development** pattern:

1. **OpenAPI Specification** (`docs/api-spec.yaml`) - Single source of truth for API contracts
2. **Generated Zod Schemas** (`src/validators.ts`) - Generated from OpenAPI spec using `openapi-zod-client`
3. **Database Validation** - This script ensures database matches API expectations

### Why API-First?

- ✅ **Type Safety**: Client and server use identical schemas
- ✅ **Single Source of Truth**: OpenAPI spec is authoritative
- ✅ **Industry Standard**: Follows best practices for API development
- ✅ **Maintainable**: Changes flow from API spec → schemas → implementation

## Features

- 🔍 **Database Schema Extraction**: Extracts tables, functions, triggers, views, enums, sequences, policies, and extensions
- 📊 **API vs Database Validation**: Compare database schema with API schemas (generated from OpenAPI)
- 🛠️ **Smart Type Mapping**: Maps PostgreSQL types to appropriate Zod types
- 🎯 **Filtering Options**: Focus on specific tables or exclude certain ones
- 📋 **Detailed Reports**: Generates comprehensive validation reports
- ⚠️ **Safety Check**: Identifies discrepancies between database and API expectations

## Quick Start

### Prerequisites

1. Set up your environment variables in `.env`:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

2. Ensure your database is accessible and the service role key has appropriate permissions.

### Primary Workflow (API-First)

```bash
# 1. Generate Zod schemas from OpenAPI spec (PRIMARY)
npm run schema:generate

# 2. Validate database consistency (SAFETY CHECK)
npm run schema:check
```

### Available Commands

```bash
# Generate schemas from OpenAPI spec
npm run schema:generate

# Validate database vs API schemas (detailed)
npm run schema:check

# Basic validation
npm run schema:validate
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed comparison information |
| `--output <path>` | Custom output directory for reports |
| `--schema <path>` | Custom path to validators.ts file |
| `--tables <list>` | Comma-separated list of tables to focus on |
| `--exclude <list>` | Comma-separated list of tables to exclude |
| `--help` | Show help message |

> **Note**: The `--sync` and `--fix` options are deprecated. Use `npm run schema:generate` instead for schema generation.

## Examples

### Generate Schemas from OpenAPI
```bash
# Generate validators.ts from OpenAPI spec
npm run schema:generate
```

### Validate Database Consistency
```bash
# Check database vs API schemas
npm run schema:check

# Focus on specific tables
node scripts/validate-schema.mjs --verbose --tables events,users,participants

# Exclude system tables
node scripts/validate-schema.mjs --verbose --exclude auth,storage
```

## API-First Schema Generation

### OpenAPI → Zod Schemas

The primary method for generating schemas is from your OpenAPI specification:

```bash
npm run schema:generate
```

This generates `validators.ts` with schemas that match your API contracts exactly.

### Example Generated Schema

```typescript
// Generated from OpenAPI spec
const SignUp = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().optional(),
}).passthrough();

const EventBase = z.object({
  title: z.string(),
  description: z.string().optional(),
  event_date: z.string().datetime({ offset: true }),
  min_guests: z.number().int().gte(1),
  max_guests: z.number().int().optional(),
}).passthrough();
```

## Supported PostgreSQL Types

The script maps PostgreSQL types to appropriate Zod types:

| PostgreSQL Type | Zod Type |
|----------------|----------|
| `uuid` | `z.string().uuid()` |
| `text`, `varchar` | `z.string()` |
| `integer`, `bigint` | `z.number().int()` |
| `numeric`, `decimal` | `z.number()` |
| `boolean` | `z.boolean()` |
| `timestamp with time zone` | `z.string().datetime({ offset: true })` |
| `timestamp` | `z.string().datetime()` |
| `date` | `z.string().date()` |
| `json`, `jsonb` | `z.record(z.any())` |
| `geography` | `z.object({ type: z.literal("Point"), coordinates: z.array(z.number()) })` |
| `text[]` | `z.array(z.string())` |
| And many more... | |

## Workflow Integration

### Development Workflow

1. **Update OpenAPI Spec**: Modify `docs/api-spec.yaml` when changing API
2. **Generate Schemas**: Run `npm run schema:generate` to update validators.ts
3. **Validate Database**: Run `npm run schema:check` to ensure database consistency
4. **Before Commits**: Run `npm run schema:check` to catch any discrepancies

### CI/CD Integration

Add to your CI pipeline:

```yaml
- name: Generate API Schemas
  run: npm run schema:generate

- name: Validate Database Consistency
  run: npm run schema:check
```

### Pre-commit Hook

Add to your `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run schema:generate
npm run schema:check
```

## Output Files

### Validation Report
- **Location**: `schema-validation-results/schema-validation-{timestamp}.json`
- **Content**: Detailed comparison between database and Zod schemas
- **Includes**: Discrepancies, recommendations, and full schema details

### Generated Fixes
- **Location**: `schema-validation-results/generated-schemas.ts`
- **Content**: Suggested Zod schemas based on database
- **Usage**: Review and integrate into your `validators.ts`

### Backup Files
- **Location**: `{schema-file}.backup.{timestamp}`
- **Content**: Original schema file before sync
- **Created**: When using `--backup` flag

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
   - Ensure the service role key has necessary permissions

2. **Permission Errors**
   - The service role key needs access to `information_schema` and `pg_*` tables
   - Ensure RLS policies don't block schema introspection

3. **Schema Parsing Errors**
   - Check that your `validators.ts` file is valid TypeScript
   - Ensure proper Zod imports and syntax

4. **Type Mapping Issues**
   - Custom types may not be mapped correctly
   - Check the generated schemas and adjust manually if needed

### Debug Mode

Run with verbose output to see detailed processing:

```bash
node scripts/validate-schema.mjs --verbose --sync
```

## Advanced Usage

### Custom Type Mapping

To add custom type mappings, modify the `mapColumnTypeToZod` method in the script:

```javascript
// Add custom mapping
if (columnType === 'custom_type') {
  return 'z.custom()';
}
```

### Filtering Complex Queries

Use table filtering for large databases:

```bash
# Only process specific tables
node scripts/validate-schema.mjs --sync --tables events,users

# Exclude system tables
node scripts/validate-schema.mjs --sync --exclude auth,storage,realtime
```

### Custom Output Directory

```bash
node scripts/validate-schema.mjs --fix --output ./custom-output
```

## Best Practices

1. **API-First Development**: Always update OpenAPI spec first, then generate schemas
2. **Regular Validation**: Run `npm run schema:check` after database migrations
3. **Review Generated Code**: Check generated schemas before committing
4. **Test After Changes**: Run your tests after schema changes
5. **Version Control**: Commit OpenAPI spec changes and generated schemas together
6. **Database Consistency**: Use validation script to ensure database matches API expectations

## Contributing

To improve the script:

1. Add new PostgreSQL type mappings in `mapColumnTypeToZod`
2. Enhance schema extraction in `SchemaExtractor` class
3. Improve validation logic in `SchemaComparator` class
4. Add new output formats in `ReportGenerator` class

## License

This script is part of the Potluck application and follows the same license terms.
