# Join Requests System - Test Plan

## Overview
Comprehensive test coverage for the join requests and event discovery system, ensuring all business logic, edge cases, and user interactions are validated.

## Test Structure

### Backend Tests (Apps/Server)

#### Unit Tests (`tests/unit/modules/requests/`)
- **requests.schema.spec.ts** - Zod schema validation
- **requests.service.spec.ts** - Business logic and service layer  
- **requests.repo.spec.ts** - Data access layer
- **requests.controller.spec.ts** - HTTP request/response handling

#### Database Function Tests (`tests/unit/db/`)
- **functions.spec.ts** - SQL function validation with test database

#### Shared Module Tests (`tests/unit/shared/`)  
- **notifier.spec.ts** - Notification system stub

#### Integration Tests (`tests/integration/`)
- **requests.spec.ts** - Basic API endpoint testing
- **requests-advanced.spec.ts** - Complex scenarios and race conditions

### Frontend Tests (Apps/Mobile)

#### Hook Tests (`__tests__/hooks/`)
- **useJoinRequests.test.tsx** - React hooks for join request state management

#### Component Tests (`__tests__/components/`)
- **AvailabilityBadge.test.tsx** - Capacity display component
- **RequestToJoinButton.test.tsx** - Join request creation UI
- **JoinRequestsManager.test.tsx** - Host management dashboard

#### Service Tests (`__tests__/services/`)
- **apiClient.test.ts** - API client methods for join requests

## Test Coverage Areas

### 🔐 Security & Authorization
- [x] RLS policies enforce request visibility rules
- [x] Only hosts can approve/decline/waitlist requests
- [x] Users can only cancel own pending requests
- [x] Anonymous access for public event discovery
- [x] Authorization checks in controllers

### 📊 Capacity Management  
- [x] Availability calculation (total, confirmed, held, available)
- [x] Soft capacity holds with TTL expiration
- [x] Atomic approval with capacity verification
- [x] Race condition prevention during concurrent approvals
- [x] Negative availability handling (overbooking scenarios)
- [x] Zero-capacity event handling

### 🔄 Request Lifecycle
- [x] Request creation with capacity validation
- [x] Duplicate request prevention
- [x] Hold expiration and background cleanup
- [x] Status transitions (pending → approved/declined/waitlisted/cancelled/expired)
- [x] Hold extension by hosts
- [x] Request cancellation by guests

### 📱 User Interface
- [x] Availability badge color coding and states
- [x] Request form validation (party size, note length)
- [x] Loading states during API calls
- [x] Error handling with user-friendly messages
- [x] Modal interactions and form reset
- [x] Host action confirmations

### 🔍 Search & Discovery
- [x] Event search with filters (text, date, location, diet)
- [x] Public event discovery (is_public flag)
- [x] Pagination for large result sets
- [x] Filter combinations and edge cases

### 📧 Notifications
- [x] Notification payload generation
- [x] Target user identification
- [x] Message formatting (singular/plural, missing data)
- [x] Batch and scheduled notifications
- [x] Error handling in notification dispatch

### ⚡ Performance & Reliability
- [x] Database query optimization
- [x] Graceful error handling
- [x] Timeout and network error scenarios  
- [x] Large dataset pagination
- [x] Concurrent request handling

## Test Scenarios

### Critical User Journeys
1. **Guest Discovery** → Search events → View availability → Request to join
2. **Host Management** → Review requests → Approve/decline → Capacity tracking
3. **Capacity Limits** → Multiple requests → First-come approval → Waitlisting
4. **Hold Expiration** → Time-based cleanup → Availability recalculation

### Edge Cases Covered
- Zero and negative capacity situations
- Expired holds and cleanup
- Malformed request data
- Network failures and retries
- Concurrent approval race conditions
- Missing or invalid UUIDs
- Boundary value testing (min/max party sizes, TTL limits)

### Error Scenarios
- Database connection failures
- Invalid authentication tokens
- Capacity overflow attempts
- Status transition violations
- RLS policy enforcement
- API rate limiting simulation

## Test Data Management

### Factories & Utilities
- **TestDataFactory** - Consistent test data creation
- **MockScenarios** - Pre-built test scenarios
- **TestHelpers** - Reusable assertion utilities
- **JoinRequestAssertions** - Domain-specific validations

### Mock Strategy
- **Service Layer** - Full mocking for unit tests
- **Repository Layer** - Supabase client mocking
- **Frontend** - API client and React Native component mocking
- **Integration** - Real database with test data isolation

## Running Tests

### Backend
```bash
# All join request tests
npm test -- --testPathPattern=requests

# Unit tests only  
npm test -- tests/unit/modules/requests/

# Integration tests
npm test -- tests/integration/requests

# Database function tests (requires test DB)
npm test -- tests/unit/db/functions.spec.ts
```

### Frontend
```bash
# All React Native tests
cd apps/mobile && npm test

# Join request specific tests
npm test -- __tests__/**/joinRequests
npm test -- __tests__/hooks/useJoinRequests

# Component tests
npm test -- __tests__/components/
```

### Coverage Goals
- **Line Coverage**: >90%
- **Branch Coverage**: >85% 
- **Function Coverage**: 100%
- **Critical Path Coverage**: 100% (capacity management, security)

## Continuous Integration

### Test Pipeline
1. **Lint** → Code quality checks
2. **Unit Tests** → Fast feedback on business logic
3. **Integration Tests** → API contract validation
4. **Database Tests** → SQL function verification (if DB available)
5. **Frontend Tests** → Component and interaction validation
6. **Coverage Report** → Ensure coverage thresholds met

### Test Database Setup
- Dedicated test database instance
- Migration application before tests
- Data cleanup between test suites
- RLS policy verification

## Quality Metrics

### Performance Benchmarks
- API response times < 200ms (95th percentile)
- Availability calculation < 50ms
- Request creation < 100ms
- Database function execution < 20ms

### Reliability Targets
- 99.9% test pass rate in CI
- Zero flaky tests
- Full rollback capability
- Graceful degradation under load

## Future Test Enhancements

### Planned Additions
- [ ] Load testing for concurrent request scenarios
- [ ] End-to-end tests with real mobile app
- [ ] Performance regression testing
- [ ] Security penetration testing
- [ ] Accessibility testing for UI components
- [ ] Notification delivery verification (when providers added)

### Monitoring Integration
- [ ] Test result reporting to observability platform
- [ ] Performance metric tracking
- [ ] Error rate monitoring
- [ ] Test coverage trend analysis
