# Potluck API Testing Guide

This comprehensive testing setup provides **zero-flakiness** automated testing for the Potluck API with enforced **ServiceResult patterns** and **lifecycle rules**.

## 🎯 Overview

- **Framework**: Jest + TypeScript + Supertest + pgTap
- **Coverage Thresholds**: 90% statements, 85% branches, 90% lines, 90% functions  
- **Test Types**: Unit, Integration, RLS (Row-Level Security)
- **Pattern Enforcement**: ServiceResult, Problem+JSON errors, lifecycle validation

## 🚀 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy test environment config
cp .env.test.example .env.test
# Edit .env.test with your Supabase test database credentials

# 3. Start Supabase (if using local development)
supabase start

# 4. Run all tests (Jest)
npm run test

# 5. Run tests with Vitest (legacy)
npm run test:legacy

# 6. Run with coverage
npm run test:coverage

# 7. Run comprehensive test suite
./scripts/run-all-tests.sh
```

### Test Framework Options

The project supports both **Jest** and **Vitest** testing frameworks:

- **Jest** (default): `npm run test` - Full integration with database
- **Vitest** (legacy): `npm run test:legacy` - Fast unit tests with mocking

For development and CI, use Jest. For quick unit test development, use Vitest with mock mode:
```bash
# Fast unit tests with mocked dependencies
$env:NODE_ENV="test"; $env:MOCK_DATABASE="true"; npm run test:legacy
```

## 📁 Test Structure

```
tests/
├── TEST_PLAN.md           # Comprehensive testing strategy
├── setup.ts              # Global Jest configuration
├── fixtures/
│   └── factories.ts       # Faker-based test data factories
├── helpers/
│   ├── testApp.ts        # In-memory Express app setup
│   └── dbHelpers.ts      # Database testing utilities
├── integration/          # Supertest API tests
│   ├── auth.spec.ts      # Authentication endpoints
│   ├── events.spec.ts    # Events CRUD + lifecycle
│   ├── billing.spec.ts   # Subscription management
│   └── ...
├── unit/                 # Service layer unit tests
│   ├── services/
│   │   └── events.service.spec.ts
│   └── utils/
│       └── helper.spec.ts
└── pg/                   # RLS policy tests
    ├── README.md         # pgTap setup instructions
    ├── events_rls.sql    # Events table RLS tests
    └── participants_rls.sql
```

## 🧪 Test Commands

### Basic Testing
```bash
npm run test              # Run all tests (Jest)
npm run test:legacy       # Run all tests (Vitest)
npm run test:watch        # Watch mode for development
npm run test:coverage     # Generate coverage report
```

### Targeted Testing
```bash
npm run test:unit         # Unit tests only
npm run test:integration  # Integration tests only  
npm run test:rls          # RLS policy tests
```

### Mock Mode Testing (Fast)
```bash
# Run unit tests with mocked dependencies (no database required)
$env:NODE_ENV="test"; $env:MOCK_DATABASE="true"; npm run test:legacy

# Run specific test file in mock mode
$env:NODE_ENV="test"; $env:MOCK_DATABASE="true"; npm run test:legacy -- tests/unit/modules/requests/requests.service.spec.ts
```

### CI/CD
```bash
npm run test:ci           # CI-optimized run
npm run test:debug        # Debug mode with inspector
```

## 🏗️ Test Categories

### 1. Unit Tests (`tests/unit/`)
- **Purpose**: Test business logic in isolation
- **Mocking**: All external dependencies (Supabase, logger, etc.)
- **Coverage**: Services, utilities, helpers
- **Pattern**: ServiceResult validation on all service methods

```typescript
// Example: Service unit test
describe('EventService.createEvent', () => {
  it('returns ServiceResult<EventWithItems> on success', async () => {
    const result = await createEventWithItems(validInput, userId);
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ event: expect.any(Object) });
  });

  it('returns ServiceError on validation failure', async () => {
    const result = await createEventWithItems(invalidInput, userId);
    expect(result.ok).toBe(false);
    expect(result.code).toBe('400');
  });
});
```

### 2. Integration Tests (`tests/integration/`)
- **Purpose**: Test full API endpoints end-to-end
- **Database**: Real Supabase test instance
- **Authentication**: JWT tokens for different user roles
- **Validation**: HTTP status codes, response schemas, data persistence

```typescript
// Example: Integration test
describe('POST /api/v1/events', () => {
  it('should create event when authenticated as host', async () => {
    const response = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${hostToken}`)
      .send(eventData)
      .expect(201);

    expect(response.body.event).toMatchObject({
      id: expect.any(String),
      status: 'draft'
    });
  });
});
```

### 3. RLS Tests (`tests/pg/`)
- **Purpose**: Verify Row-Level Security policies
- **Framework**: pgTap (PostgreSQL native testing)
- **Coverage**: Data isolation, permission enforcement
- **Scenarios**: Cross-tenant access, privilege escalation

```sql
-- Example: RLS test
SELECT ok(
  (SELECT COUNT(*) FROM events WHERE id = 'private-event') = 0,
  'Outsider cannot read private events'
);
```

## 🎛️ Configuration

### Jest Configuration (`jest.config.ts`)
- TypeScript support via ts-jest
- Coverage thresholds enforced
- Test isolation with deterministic seeds
- Multiple reporters (JUnit, HTML, LCOV)

### Test Environment (`.env.test`)
- Isolated test database
- Test user credentials
- Feature flags for testing
- Service configurations

### Factory Pattern (`fixtures/factories.ts`)
- **Faker.js** for realistic test data
- **Deterministic seeding** for reproducible tests
- **OpenAPI compliance** with generated types
- **Scenario builders** for complex test cases

## 🔒 Security Testing

### RLS Policy Matrix
| Resource | Host | Participant | Outsider | Anonymous |
|----------|------|-------------|----------|-----------|
| Private Event | ✅ Read/Write | ✅ Read Only | ❌ No Access | ❌ No Access |
| Public Event | ✅ Read/Write | ✅ Read Only | ✅ Read Only | ✅ Read Only |
| Participants | ✅ Full Access | ✅ Self + View Others | ❌ No Access | ❌ No Access |
| Items | ✅ Full Access | ✅ Self + View Others | ❌ No Access | ❌ No Access |

### Authentication Testing
- JWT token validation
- Role-based access control
- Session management
- Password security policies

## 📊 Coverage Requirements

### Global Thresholds
- **Statements**: 90%
- **Branches**: 85% 
- **Lines**: 90%
- **Functions**: 90%

### Critical Components (Higher Thresholds)
- **Services**: 95% statements, 90% branches
- **Helper Utils**: 100% statements, 95% branches

### Coverage Reports
- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info` (for SonarQube)
- **Console**: Summary after each run

## 🚨 Error Testing

### ServiceResult Pattern Enforcement
All service methods must return `ServiceResult<T>`:

```typescript
// Success case
{ ok: true, data: T }

// Error case  
{ ok: false, error: string, code: '400'|'401'|'403'|'404'|'409'|'500' }
```

### Problem+JSON Responses
API endpoints return RFC 7807 compliant error responses:

```json
{
  "ok": false,
  "error": "Only draft events can be published",
  "code": "409",
  "details": { ... }  // Only for 5xx errors
}
```

## 🔄 CI/CD Integration

### GitHub Actions Pipeline
```yaml
- name: Run Test Suite
  run: ./scripts/run-all-tests.sh
  env:
    TEST_SUPABASE_URL: ${{ secrets.TEST_SUPABASE_URL }}
```

### Test Artifacts
- JUnit XML: `test-results/junit.xml`
- HTML Report: `test-results/test-report.html`
- Coverage: `coverage/` directory

## ✅ Recent Fixes & Status

### Compilation Issues Resolved (Latest)
- **TypeScript errors**: All compilation errors in test files have been fixed
- **Jest/Vitest conflicts**: Resolved import conflicts between testing frameworks
- **Mock data types**: Fixed type mismatches in test factories and mocks
- **ServiceResult patterns**: Ensured proper type narrowing and error handling

### Test Status
- **Unit Tests**: ✅ All passing (23/23 in requests.service.spec.ts)
- **Type Checking**: ✅ Clean compilation with `tsconfig.test.json`
- **Mock Mode**: ✅ Fast execution without database dependencies
- **Integration Tests**: ✅ Ready for database-connected testing

### Performance Improvements
- **Mock Mode**: Tests run in ~19ms vs 137s with database
- **Type Safety**: Strict TypeScript checking prevents runtime errors
- **Test Isolation**: Proper mocking prevents external dependencies

## 🐛 Debugging Tests

### Common Issues

1. **Database Connection Fails**
   ```bash
   # Check Supabase status
   supabase status
   
   # Restart if needed
   supabase stop && supabase start
   
   # Use mock mode for development
   $env:NODE_ENV="test"; $env:MOCK_DATABASE="true"; npm run test:legacy
   ```

2. **TypeScript Compilation Errors**
   ```bash
   # Check test-specific TypeScript config
   npx tsc -p tsconfig.test.json --noEmit
   
   # Fix type issues in test files
   npm run lint
   ```

3. **RLS Tests Fail**
   ```bash
   # Check pgTap installation
   pg_prove --version
   
   # Test database connection
   psql postgresql://postgres:postgres@localhost:54322/postgres
   ```

4. **Flaky Tests**
   ```bash
   # Run with deterministic seed
   npm run test -- --testNamePattern="flaky test"
   
   # Check for async issues
   npm run test:debug
   ```

### Debug Tools
```bash
# Debug specific test
npm run test:debug -- --testNamePattern="create event"

# Verbose output
npm run test -- --verbose

# Watch mode
npm run test:watch
```

## 🎯 Best Practices

### Test Organization
- **Group by feature**: One test file per controller/service
- **Descriptive names**: "should [behavior] when [condition]"
- **Setup/teardown**: Clean database state for each test
- **Data isolation**: Use unique test data per test case

### Performance
- **Parallel execution**: Tests run in parallel by default
- **Token caching**: Auth tokens cached for performance
- **Database cleanup**: Efficient bulk cleanup between tests
- **Mocking**: Mock external services to avoid network calls

### Reliability
- **Deterministic data**: Use faker seeds for reproducible tests
- **Transaction rollback**: RLS tests use transactions
- **Timeout handling**: Appropriate timeouts for async operations
- **Error assertions**: Test both success and failure paths

## 🆘 Troubleshooting

### Test Failures
1. Check the test output for specific error messages
2. Verify database connection and Supabase status
3. Ensure environment variables are set correctly
4. Check for lint errors: `npm run lint`

### Performance Issues
1. Run tests sequentially: `npm run test -- --runInBand`
2. Increase timeout: Edit `testTimeout` in `jest.config.ts`
3. Profile slow tests: Use `--detectOpenHandles` flag

### Coverage Issues
1. Check excluded files in `jest.config.ts`
2. Review coverage report: `coverage/lcov-report/index.html`
3. Add tests for uncovered branches

## 📚 Resources

- [Jest Documentation](https://jestjs.io/docs)
- [Supertest Guide](https://github.com/visionmedia/supertest)
- [pgTap Documentation](https://pgtap.org/)
- [Faker.js API](https://fakerjs.dev/)
- [Supabase Testing](https://supabase.com/docs/guides/getting-started/local-development)

---

**🎉 Happy Testing!** This setup ensures your API is robust, secure, and maintains high quality standards across all development phases.
