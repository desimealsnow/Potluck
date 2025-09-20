# Potluck API - Comprehensive Test Plan

> **Version**: 1.0  
> **Target Coverage**: Statements 90%, Branches 85%, Lines 90%, Functions 90%  
> **Framework**: Jest + Supertest + pgTap (optional)

## 1. Overview

This test plan ensures comprehensive coverage of the Potluck API backend, including:
- **Unit Tests**: Services with mocked dependencies
- **Integration Tests**: Controllers via Supertest 
- **RLS Tests**: Row-Level Security policy validation
- **Contract Tests**: OpenAPI schema compliance

All tests enforce our **ServiceResult pattern** and **lifecycle rules** as defined in the architecture documentation.

---

## 2. Test Architecture

```
tests/
├── setup.ts              # Global Jest setup, DB bootstrap
├── fixtures/
│   └── factories.ts       # Faker-based data factories  
├── integration/           # Supertest controller tests
│   ├── auth.spec.ts
│   ├── events.spec.ts
│   ├── items.spec.ts
│   ├── participants.spec.ts
│   ├── locations.spec.ts
│   └── billing.spec.ts
├── unit/                  # Service layer unit tests
│   ├── services/
│   │   ├── auth.service.spec.ts
│   │   ├── events.service.spec.ts
│   │   ├── items.service.spec.ts
│   │   ├── participants.service.spec.ts
│   │   └── locations.service.spec.ts
│   └── utils/
│       ├── helper.spec.ts
│       └── eventGuards.spec.ts
├── pg/                    # RLS and database tests
│   ├── README.md
│   └── rls-policies.sql   # pgTap test cases
└── helpers/
    ├── testApp.ts         # In-memory Express app
    ├── dbHelpers.ts       # DB seeding/cleanup
    └── mockClients.ts     # Supabase client mocks
```

---

## 3. Test Coverage Matrix

### 3.1 Events Module

| Endpoint | Integration Test | Service Test | RLS Test | Happy Path | Error Cases |
|----------|-----------------|--------------|----------|------------|-------------|
| `POST /events` | ✅ `events.spec.ts` | ✅ `events.service.spec.ts` | ✅ Host can create | Event creation with items | Missing fields, invalid location |
| `GET /events` | ✅ | ✅ | ✅ Host/participant visibility | Pagination, filtering | No events found |
| `GET /events/:id` | ✅ | ✅ | ✅ Event visibility | Full event details | Not found, no permission |
| `PATCH /events/:id` | ✅ | ✅ | ✅ Host-only updates | Update event details | Non-host attempt, invalid status |
| `DELETE /events/:id` | ✅ | ✅ | ✅ Host can delete drafts | Hard delete draft event | Cannot delete published |
| `POST /events/:id/publish` | ✅ | ✅ | ✅ Host can publish drafts | Draft → published | Already published, not host |
| `POST /events/:id/cancel` | ✅ | ✅ | ✅ Host can cancel published | Published → cancelled | Not published, missing reason |
| `POST /events/:id/complete` | ✅ | ✅ | ✅ Host can complete published | Published → completed | Not published, not host |

### 3.2 Items Module

| Endpoint | Integration Test | Service Test | RLS Test | Happy Path | Error Cases |
|----------|-----------------|--------------|----------|------------|-------------|
| `GET /events/:id/items` | ✅ `items.spec.ts` | ✅ `items.service.spec.ts` | ✅ Participant visibility | List event items | Event not found |
| `POST /events/:id/items` | ✅ | ✅ | ✅ Participant can add | Add item to event | Not a participant |
| `GET /events/:id/items/:itemId` | ✅ | ✅ | ✅ Item visibility | Get item details | Item not found |
| `PUT /events/:id/items/:itemId` | ✅ | ✅ | ✅ Owner/host can update | Update item details | Not owner or host |
| `DELETE /events/:id/items/:itemId` | ✅ | ✅ | ✅ Owner/host can delete | Delete item | Not authorized |
| `POST /events/:id/items/:itemId/assign` | ✅ | ✅ | ✅ Self-assign or host assign | Assign item to user | Already assigned |
| `DELETE /events/:id/items/:itemId/assign` | ✅ | ✅ | ✅ Unassign permissions | Unassign item | Not assigned |

### 3.3 Participants Module

| Endpoint | Integration Test | Service Test | RLS Test | Happy Path | Error Cases |
|----------|-----------------|--------------|----------|------------|-------------|
| `POST /events/:id/participants` | ✅ `participants.spec.ts` | ✅ `participants.service.spec.ts` | ✅ Host invite, self-join public | Add participant | Already joined |
| `GET /events/:id/participants` | ✅ | ✅ | ✅ Participant visibility | List participants | Not a participant |
| `GET /events/:id/participants/:partId` | ✅ | ✅ | ✅ Participant details | Get RSVP status | Not found |
| `PUT /events/:id/participants/:partId` | ✅ | ✅ | ✅ Self/host can update | Update RSVP | Invalid status |
| `DELETE /events/:id/participants/:partId` | ✅ | ✅ | ✅ Self-leave, host-kick | Remove participant | Cannot remove host |
| `POST /events/:id/participants/bulk` | ✅ | ✅ | ✅ Host bulk invite | Bulk participant invite | Duplicate invites |
| `POST /events/:id/participants/:partId/resend` | ✅ | ✅ | ✅ Host resend invite | Resend invitation | Already accepted |

### 3.4 Auth Module

| Endpoint | Integration Test | Service Test | RLS Test | Happy Path | Error Cases |
|----------|-----------------|--------------|----------|------------|-------------|
| `POST /auth/signup` | ✅ `auth.spec.ts` | ✅ `auth.service.spec.ts` | N/A | User registration | Email exists, weak password |
| `POST /auth/login` | ✅ | ✅ | N/A | User authentication | Invalid credentials |
| `POST /auth/logout` | ✅ | ✅ | N/A | Session termination | Invalid token |

### 3.5 Billing Module  

| Endpoint | Integration Test | Service Test | RLS Test | Happy Path | Error Cases |
|----------|-----------------|--------------|----------|------------|-------------|
| `GET /billing/plans` | ✅ `billing.spec.ts` | ✅ `billing.service.spec.ts` | N/A | List active plans | No plans available |
| `POST /billing/checkout/subscription` | ✅ | ✅ | N/A | Start checkout flow | Invalid plan |
| `GET /billing/subscriptions` | ✅ | ✅ | ✅ User's subscriptions only | List user subscriptions | No subscriptions |
| `GET /billing/subscriptions/:id` | ✅ | ✅ | ✅ Owner-only access | Get subscription details | Not owner |
| `PUT /billing/subscriptions/:id` | ✅ | ✅ | ✅ Owner can update | Update subscription | Invalid update |
| `DELETE /billing/subscriptions/:id` | ✅ | ✅ | ✅ Owner can cancel | Cancel subscription | Already cancelled |

### 3.6 Locations Module

| Endpoint | Integration Test | Service Test | RLS Test | Happy Path | Error Cases |
|----------|-----------------|--------------|----------|------------|-------------|
| `GET /locations` | ✅ `locations.spec.ts` | ✅ `locations.service.spec.ts` | N/A | Search locations | No results |
| `POST /locations` | ✅ | ✅ | N/A | Create/resolve location | Invalid coordinates |

---

## 4. RLS Policy Test Matrix

### 4.1 Events Table

| Scenario | Expected Result | Test Case |
|----------|----------------|-----------|
| Anonymous user reads public event | ✅ Allow | `SELECT * FROM events WHERE is_public = true` |
| Anonymous user reads private event | ❌ Deny | `SELECT * FROM events WHERE is_public = false` |
| Authenticated user reads hosted event | ✅ Allow | `auth.uid() = host_id` |
| Authenticated user reads participated event | ✅ Allow | Via `event_participants` join |
| Host updates own event | ✅ Allow | `host_id = auth.uid()` |
| Non-host updates event | ❌ Deny | RLS blocks update |
| Host deletes own event | ✅ Allow | `host_id = auth.uid()` |
| Non-host deletes event | ❌ Deny | RLS blocks delete |

### 4.2 Participants Table

| Scenario | Expected Result | Test Case |
|----------|----------------|-----------|
| Host invites participant to private event | ✅ Allow | Host check + event ownership |
| User self-joins public event | ✅ Allow | `is_public = true` check |
| User self-joins private event | ❌ Deny | RLS blocks insert |
| Participant updates own RSVP | ✅ Allow | `user_id = auth.uid()` |
| Host updates participant RSVP | ✅ Allow | Host privilege |
| Non-participant reads participant list | ❌ Deny | Not in event |

### 4.3 Items Table

| Scenario | Expected Result | Test Case |
|----------|----------------|-----------|
| Participant reads event items | ✅ Allow | Via event visibility |
| Non-participant reads event items | ❌ Deny | Not in event |
| Item owner updates own item | ✅ Allow | `brought_by = auth.uid()` |
| Host updates any item | ✅ Allow | Host privilege |
| Non-owner updates item | ❌ Deny | RLS blocks update |

### 4.4 Edge Cases

| Scenario | Expected Result | Notes |
|----------|----------------|-------|
| Soft-deleted (purged) events | ❌ Hidden | `status != 'purged'` filter |
| Archived events | ✅ Visible | Unless explicitly filtered |
| Cancelled events | ✅ Visible | Participants should see cancellation |
| Service role access | ✅ Bypass | All tables for admin operations |

---

## 5. Test Data Strategy  

### 5.1 Factory Pattern

```typescript
// factories.ts
export const EventFactory = Factory.define<CreateEventInput>(() => ({
  title: faker.lorem.words(3),
  description: faker.lorem.paragraph(),
  event_date: faker.date.future(),
  min_guests: faker.number.int({ min: 2, max: 10 }),
  max_guests: faker.number.int({ min: 11, max: 50 }),
  meal_type: faker.helpers.arrayElement(['veg', 'nonveg', 'mixed']),
  location: LocationFactory.build(),
  items: ItemFactory.buildList(3)
}));
```

### 5.2 Test Isolation

- **Database Reset**: Each test file gets a clean DB state
- **Deterministic Seeds**: Use `faker.seed()` for reproducible data
- **Parallel Execution**: Tests run in isolation with separate DB schemas
- **Transaction Rollback**: Unit tests wrap in transactions, rollback after assertions

### 5.3 Authentication Setup

```typescript
// Test users with known credentials
const TEST_USERS = {
  HOST: { email: 'host@test.dev', password: 'password123' },
  PARTICIPANT: { email: 'participant@test.dev', password: 'password123' },
  OUTSIDER: { email: 'outsider@test.dev', password: 'password123' }
};
```

---

## 6. Error Handling Validation

### 6.1 ServiceResult Pattern Tests

Every service method must be tested for both success and error paths:

```typescript
describe('EventService.createEvent', () => {
  it('returns ServiceResult<EventWithItems> on success', async () => {
    const result = await createEventWithItems(validInput, userId);
    expect(result.ok).toBe(true);
    expect(result.data).toMatchObject({ event: expect.any(Object) });
  });

  it('returns ServiceError on validation failure', async () => {
    const result = await createEventWithItems(invalidInput, userId);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('validation');
    expect(result.code).toBe('400');
  });
});
```

### 6.2 HTTP Status Code Mapping

| Service Error Code | HTTP Status | Test Validation |
|-------------------|-------------|-----------------|
| '400' | 400 Bad Request | Input validation errors |
| '401' | 401 Unauthorized | Missing/invalid JWT |
| '403' | 403 Forbidden | RLS policy violation |
| '404' | 404 Not Found | Resource not found |
| '409' | 409 Conflict | State transition error |
| '500' | 500 Internal Error | Database/system errors |

### 6.3 Problem+JSON Response Format

```json
{
  "ok": false,
  "error": "Only draft events can be published",
  "code": "409",
  "details": { ... }  // Only for 5xx errors
}
```

---

## 7. Performance & Load Testing

### 7.1 Database Query Optimization Tests

- **N+1 Query Detection**: Monitor query counts in integration tests
- **RLS Performance**: Measure helper function execution time
- **Index Usage**: Verify `EXPLAIN ANALYZE` for complex queries

### 7.2 Concurrent Access Tests

- **Race Conditions**: Multiple users updating same event
- **Deadlock Prevention**: Concurrent item assignments  
- **Transaction Isolation**: Verify ACID properties

---

## 8. CI/CD Integration

### 8.1 GitHub Actions Pipeline

```yaml
test:
  runs-on: ubuntu-latest
  services:
    postgres:
      image: supabase/postgres:15.1.0
      env:
        POSTGRES_PASSWORD: postgres
  steps:
    - uses: actions/checkout@v3
    - run: npm ci
    - run: npx supabase start
    - run: npm run test:coverage
    - run: npm run test:rls  # pgTap tests
```

### 8.2 Coverage Gates

- **Minimum Coverage**: 90% statements, 85% branches
- **Coverage Reports**: Generate LCOV for SonarQube integration
- **Fail on Decrease**: Block PR if coverage drops below thresholds

---

## 9. Test Execution Strategy

### 9.1 Test Suites

```bash
# Unit tests only (fast feedback)
npm run test:unit

# Integration tests (database required)  
npm run test:integration

# RLS tests (pgTap required)
npm run test:rls

# Full test suite with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### 9.2 Debugging Support

- **Test Isolation**: Run single test files with `--testNamePattern`
- **Database Inspection**: Keep test DB running with `--detectOpenHandles`
- **Request Logging**: Capture HTTP requests/responses in integration tests

---

## 10. Maintenance & Documentation

### 10.1 Test Documentation Standards

- **Describe Blocks**: Group by feature/endpoint
- **Test Names**: Follow "should [behavior] when [condition]" pattern
- **Assertions**: Use meaningful messages for failures
- **Setup/Teardown**: Document side effects and cleanup

### 10.2 Test Data Versioning

- **Schema Changes**: Update factories when API schemas change
- **Migration Testing**: Verify backward compatibility
- **Contract Testing**: Validate OpenAPI spec compliance

---

## 11. Success Metrics

- **✅ Zero Flaky Tests**: Deterministic, isolated execution
- **✅ Fast Feedback**: Unit tests complete in <30s
- **✅ High Coverage**: Exceed all threshold requirements  
- **✅ Contract Compliance**: All responses match OpenAPI spec
- **✅ RLS Enforcement**: No data leakage between tenants
- **✅ Production Confidence**: Comprehensive error scenario coverage

---

*This test plan ensures comprehensive quality assurance for the Potluck API while maintaining development velocity and production reliability.*
