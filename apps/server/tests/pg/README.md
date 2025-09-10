# PostgreSQL Row-Level Security (RLS) Testing

This directory contains tests for verifying Row-Level Security policies in our Supabase database. These tests ensure that data access controls work correctly and prevent unauthorized access between tenants.

## Overview

RLS tests validate that:
- Users can only access events they host or participate in
- Participants can only view/edit their own RSVP status  
- Item assignments respect ownership and host privileges
- Billing data is properly isolated by user
- Anonymous access is limited to public events only

## Test Framework Options

### Option 1: pgTap (Recommended)

pgTap is a testing framework for PostgreSQL that runs directly in the database.

#### Setup

1. Install pgTap extension in your test database:
```sql
CREATE EXTENSION IF NOT EXISTS pgtap;
```

2. Run tests via `pg_prove`:
```bash
npm run test:rls
# or directly:
pg_prove tests/pg/*.sql --host localhost --port 54322 --username postgres --dbname postgres
```

#### Benefits
- Tests run at database level, closest to actual RLS enforcement
- No application layer interference
- Fast execution
- Can test complex SQL scenarios

#### Example Test File Structure
```sql
-- tests/pg/events_rls.sql
BEGIN;
SELECT plan(10);

-- Test 1: Host can read own events
SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = test_event_id) = 1,
  'Host can read own events'
);

-- Test 2: Non-participant cannot read private events  
SET LOCAL "request.jwt.claims" TO '{"sub": "outsider-id"}';
SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = test_event_id) = 0,
  'Non-participant cannot read private events'
);

SELECT * FROM finish();
ROLLBACK;
```

### Option 2: SQL-based Jest Tests

Alternative approach using Jest with raw SQL queries.

#### Setup

```bash
npm run test:integration tests/pg/rls.spec.js
```

#### Benefits
- Integrates with existing Jest test suite
- Can combine with application-level testing
- TypeScript support for test logic

#### Example
```typescript
describe('RLS Policies', () => {
  it('should prevent cross-tenant data access', async () => {
    // Create event as user A
    const eventA = await createEventAsUser(userA.id);
    
    // Try to access as user B
    const { data } = await supabaseClientB
      .from('events')
      .select('*')
      .eq('id', eventA.id);
      
    expect(data).toHaveLength(0);
  });
});
```

### Option 3: Supabase CLI Test Runner

Using Supabase's built-in testing capabilities.

```bash
supabase test db
```

## Test Scenarios

### Events Table RLS

| Test Case | Expected Behavior | SQL Test |
|-----------|------------------|----------|
| Host reads own event | ✅ Allow | `SELECT * FROM events WHERE created_by = auth.uid()` |
| Participant reads event they joined | ✅ Allow | Via `event_participants` join |
| Outsider reads private event | ❌ Deny | Should return 0 rows |
| Anonymous reads public event | ✅ Allow | `is_public = true` events only |
| Host updates own event | ✅ Allow | `UPDATE events SET title = 'New' WHERE id = ?` |
| Non-host updates event | ❌ Deny | Should fail with RLS violation |

### Participants Table RLS

| Test Case | Expected Behavior | SQL Test |
|-----------|------------------|----------|
| Host invites participant | ✅ Allow | `INSERT INTO event_participants (event_id, user_id, status)` |
| User self-joins public event | ✅ Allow | Self-registration to public events |
| User self-joins private event | ❌ Deny | RLS should block |
| Participant updates own RSVP | ✅ Allow | `UPDATE event_participants SET status = 'accepted'` |
| Host updates participant RSVP | ✅ Allow | Host can modify any participant |
| Outsider reads participant list | ❌ Deny | Should return 0 rows |

### Items Table RLS

| Test Case | Expected Behavior | SQL Test |
|-----------|------------------|----------|
| Participant adds item to event | ✅ Allow | Must be participant in event |
| Non-participant adds item | ❌ Deny | RLS violation |
| Item owner updates item | ✅ Allow | `brought_by = auth.uid()` |
| Host updates any item | ✅ Allow | Host privilege |
| Non-owner updates item | ❌ Deny | RLS blocks |

### Billing Tables RLS

| Test Case | Expected Behavior | SQL Test |
|-----------|------------------|----------|
| User reads own subscriptions | ✅ Allow | `user_id = auth.uid()` |
| User reads others' subscriptions | ❌ Deny | Should return 0 rows |
| User updates own payment method | ✅ Allow | Ownership check |
| User updates others' payment method | ❌ Deny | RLS violation |

## Running RLS Tests

### Local Development

```bash
# Start local Supabase
supabase start

# Run all RLS tests
npm run test:rls

# Run specific test file
pg_prove tests/pg/events_rls.sql --host localhost --port 54322
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
- name: Run RLS Tests
  run: |
    supabase start
    npm run test:rls
  env:
    SUPABASE_DB_URL: postgresql://postgres:postgres@localhost:54322/postgres
```

## Writing New RLS Tests

### 1. Identify the Security Requirement
- What data should be accessible?
- What operations should be allowed?
- What should be blocked?

### 2. Create Test Users
```sql
-- Set up test users with known UUIDs
INSERT INTO auth.users (id, email) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'host@test.dev'),
  ('22222222-2222-2222-2222-222222222222', 'participant@test.dev'),
  ('33333333-3333-3333-3333-333333333333', 'outsider@test.dev');
```

### 3. Test Positive Cases (Should Work)
```sql
-- Switch to host user context
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111"}';

-- Test that allowed operation works
SELECT ok(
  (INSERT INTO events (title, created_by) VALUES ('Test', auth.uid()) RETURNING id) IS NOT NULL,
  'Host can create events'
);
```

### 4. Test Negative Cases (Should Fail)
```sql
-- Switch to outsider user context
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333"}';

-- Test that blocked operation fails
SELECT throws_ok(
  'UPDATE events SET title = ''Hacked'' WHERE created_by != auth.uid()',
  'RLS policy violation'
);
```

### 5. Clean Up
```sql
-- Reset to clean state
ROLLBACK;
```

## Troubleshooting RLS Tests

### Common Issues

1. **Tests Pass in Application but Fail in pgTap**
   - RLS policies may be bypassed by service role
   - Ensure tests use authenticated user context

2. **Inconsistent Test Results**
   - Transaction state not properly reset
   - Use `ROLLBACK` to ensure clean state

3. **Policy Not Applied**
   - Check if RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
   - Verify policy exists: `\d+ table_name` in psql

4. **Helper Functions Not Found**
   - Ensure RLS helper functions are created
   - Check search_path includes proper schema

### Debugging Commands

```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public';

-- Test current user context
SELECT auth.uid(), auth.role();
```

## Best Practices

1. **Test Coverage**: Every RLS policy should have corresponding tests
2. **Edge Cases**: Test boundary conditions (empty results, null values)
3. **Performance**: Monitor policy performance with `EXPLAIN ANALYZE`
4. **Documentation**: Keep RLS tests in sync with policy documentation
5. **Isolation**: Each test should be independent and clean up after itself
6. **Realistic Data**: Use data that resembles production scenarios

## Integration with Main Test Suite

RLS tests complement but don't replace integration tests:

- **RLS Tests**: Database-level policy enforcement
- **Integration Tests**: End-to-end API behavior including RLS
- **Unit Tests**: Business logic without database dependencies

All three layers provide comprehensive security validation.
