# Potluck Playwright Test Suite

This directory contains comprehensive end-to-end tests for the Potluck mobile application using Playwright.

## 🎯 Test Overview

The test suite covers all major functionality of the Potluck platform, including:

- **Multi-user scenarios** - Host and guest interactions
- **Event lifecycle management** - Create, publish, cancel, complete events
- **Join request workflows** - Request, approve, reject, waitlist
- **Item management** - Add, edit, claim, unclaim items
- **Edge cases** - Error handling, capacity limits, network issues
- **Cross-platform testing** - Desktop, mobile, tablet
- **Authentication flows** - Login, signup, validation, error handling
- **UI element testing** - Comprehensive testID coverage for reliable element selection

## ✅ Current Status

**Last Updated**: December 2024

### Test Architecture
- ✅ **Reusable Test Utilities** - Comprehensive utility functions for common test operations
- ✅ **Smart Login Detection** - Automatic detection of existing login state
- ✅ **Event Lifecycle Management** - Complete event creation, publishing, cancellation, and deletion workflows
- ✅ **Multi-User Scenarios** - Host and guest interaction patterns
- ✅ **Test ID Coverage** - Comprehensive testID attributes for reliable element selection
- ✅ **Sequential Test Execution** - Configured to prevent state corruption between tests

### Key Features Implemented
- **Event Test Utilities** (`event-test-utilities.ts`): Reusable functions for event management
- **Smart Login System**: Checks if user is already logged in before attempting login
- **Comprehensive Test Coverage**: 15+ test files covering all major functionality
- **Error Handling**: Robust error handling and recovery mechanisms
- **Cross-Platform Testing**: Desktop, mobile, and tablet configurations

## 📁 Test Structure

```
tests/ui/
├── README.md                           # This file
├── run-tests.ts                        # Test runner script
├── test-utilities.ts                   # Test utilities and helpers
├── global-setup.ts                     # Global test setup
├── global-teardown.ts                  # Global test teardown
├── auth.spec.ts                        # Authentication flow tests
├── event-list.spec.ts                  # Event list and navigation tests
├── create-event.spec.ts                # Event creation tests
├── event-details.spec.ts               # Event details and management tests
├── multi-user-scenarios.spec.ts        # Multi-user interaction tests
├── event-lifecycle.spec.ts             # Event lifecycle tests
├── join-request-workflow.spec.ts       # Join request workflow tests
├── item-management.spec.ts             # Item management tests
├── edge-cases.spec.ts                  # Edge case and error handling tests
├── debug.spec.ts                       # Debug and troubleshooting tests
├── console-debug.spec.ts               # Console error debugging tests
└── test-results/                       # Test results and screenshots
```

## 🚀 Quick Start

### Prerequisites

1. **Mobile app running**: Ensure the mobile app is running on `http://localhost:8081`
   ```bash
   cd /workspace/apps/mobile
   npx expo start --web --port 8081
   ```
2. **Dependencies installed**: Ensure all required dependencies are installed:
   ```bash
   npm install
   npx playwright install
   ```
3. **Test users**: Ensure test users exist in the database:
   - `host@test.dev` / `password123`
   - `guest@test.dev` / `password123`
   - `guest2@test.dev` / `password123`
   - `guest3@test.dev` / `password123`

### Running Tests

```bash
# Run all tests
npm run test:playwright all

# Run specific test suite
npm run test:playwright multi-user

# Run smoke tests only
npm run test:playwright smoke

# Run mobile tests only
npm run test:playwright mobile-only

# Run with custom mobile URL
MOBILE_WEB_URL=http://localhost:3000 npm run test:playwright all
```

### Available Test Suites

| Suite | Description | Duration | Status |
|-------|-------------|----------|---------|
| `smoke` | Basic functionality tests | ~5 min | ✅ Working |
| `auth` | Authentication flow tests | ~3 min | ✅ Working |
| `multi-user` | Host-guest interactions | ~10 min | ✅ Ready |
| `event-lifecycle` | Event management workflows | ~10 min | ✅ Ready |
| `join-requests` | Join request workflows | ~10 min | ✅ Ready |
| `item-management` | Item claiming and management | ~10 min | ✅ Ready |
| `edge-cases` | Error handling and edge cases | ~10 min | ✅ Ready |
| `all` | Complete test suite | ~30 min | ✅ Ready |
| `ui-only` | Desktop Chrome only | ~20 min | ✅ Ready |
| `mobile-only` | Mobile Chrome only | ~20 min | ✅ Ready |
| `tablet-only` | Tablet Chrome only | ~20 min | ✅ Ready |

## 🧪 Test Scenarios

### Authentication Flows (`auth.spec.ts`)

**Functional Coverage:**
- **Login Flow**: Valid credentials, invalid credentials, empty fields validation
- **Signup Flow**: New user registration, email validation, password requirements
- **Form Validation**: Real-time validation feedback, error messages
- **Password Toggle**: Show/hide password functionality (React Native Web `type` attribute)
- **Mode Switching**: Toggle between login and signup modes
- **Button States**: Disabled state validation using `aria-disabled` attribute

**Reusable Logic:**
```typescript
// Smart login detection
const isLoggedIn = await checkLoginState(page);
if (!isLoggedIn) {
  await performLogin(page, email, password);
}
```

### Event Lifecycle Management (`event-lifecycle.spec.ts`)

**Functional Coverage:**
- **Complete Event Creation**: 4-step wizard (details, location, menu, participants)
- **Event Publishing**: Draft → Published transition
- **Event Cancellation**: Published → Cancelled transition
- **Event Deletion**: Complete removal with confirmation
- **Status Verification**: All event status changes and UI updates

**Reusable Logic:**
```typescript
// Event creation utility
await createAndPublishEvent(page, title, description, minGuests, maxGuests);

// Event management utilities
await cancelEvent(page);
await deleteEvent(page);
await verifyEventStatus(page, expectedStatus);
```

### Multi-User Scenarios (`multi-user-scenarios.spec.ts`, `multi-user-simplified.spec.ts`)

**Functional Coverage:**
- **Host-Guest Workflow**: Host creates event → Guest requests → Host approves/rejects
- **Event Participation**: Guest joins approved events
- **Item Management**: Host and guest collaborate on item claiming
- **Capacity Management**: Waitlist functionality when events are full
- **Concurrent Actions**: Multiple users interacting simultaneously

**Reusable Logic:**
```typescript
// Multi-user setup
await setupHostGuestScenario(hostPage, guestPage, eventTitle);

// Guest operations
await requestToJoinEvent(page, eventId);
await approveGuestRequest(page, guestDisplayName);
await rejectGuestRequest(page, guestDisplayName);
```

### Event List & Filtering (`event-list.spec.ts`)

**Functional Coverage:**
- **Event Display**: List all events with proper formatting
- **Search Functionality**: Real-time search across events
- **Filter Operations**: Status, ownership, and dietary preference filters
- **Navigation**: Header actions and navigation buttons
- **Empty States**: Handling when no events are present

**Reusable Logic:**
```typescript
// Filter interactions
await page.getByTestId('filter-toggle-button').click();
await page.getByTestId('status-filter-option-upcoming').click();
await page.getByTestId('ownership-mine').click();
```

### Join Request Workflows (`join-request-workflow.spec.ts`)

**Functional Coverage:**
- **Request Management**: Guest requests to join events
- **Approval Process**: Host approves/rejects requests
- **Status Tracking**: Request status updates and notifications
- **Bulk Operations**: Managing multiple join requests
- **Expiration Handling**: Cleanup of expired requests

**Reusable Logic:**
```typescript
// Join request utilities
await requestToJoinEvent(page, eventId);
await approveGuestRequest(page, guestDisplayName);
await rejectGuestRequest(page, guestDisplayName);
```

### Item Management (`item-management.spec.ts`)

**Functional Coverage:**
- **Item Creation**: Host adds items to events
- **Item Claiming**: Guests claim and unclaim items
- **Progress Tracking**: Monitor item completion status
- **Category Management**: Organize items by categories
- **Quantity Management**: Per-guest quantity calculations

### Edge Cases (`edge-cases.spec.ts`)

**Functional Coverage:**
- **Network Issues**: Offline behavior and recovery
- **Capacity Limits**: Event overflow handling
- **Concurrent Actions**: Race condition prevention
- **Data Persistence**: Recovery after crashes
- **Error Handling**: Invalid data and validation errors

### Complete User Journey (`complete-user-journey.spec.ts`)

**Functional Coverage:**
- **End-to-End Flow**: Complete user experience from login to event completion
- **Navigation Testing**: All major navigation paths
- **State Persistence**: Data persistence across navigation
- **Filter Integration**: Testing filters in real user scenarios
- **Event Management**: Complete event lifecycle in user context

**Reusable Logic:**
```typescript
// Complete journey utilities
await loginAsHost(page);
await createAndPublishEvent(page, title, description);
await navigateToEventDetails(page);
await manageEventFilters(page);
```

## 🛠️ Reusable Test Utilities

### Core Utility Files

#### 1. `event-test-utilities.ts` - Event Management Utilities
**Purpose**: Centralized functions for event lifecycle management and user authentication.

**Key Functions:**
```typescript
// Authentication
await loginUser(page, email, password, userType);
await loginAsHost(page);
await loginAsGuest(page, guestNumber);

// Event Management
await createEvent(page, title, description, minGuests, maxGuests);
await publishEvent(page);
await createAndPublishEvent(page, title, description, minGuests, maxGuests);
await cancelEvent(page);
await deleteEvent(page);

// Guest Operations
await requestToJoinEvent(page, eventId);
await approveGuestRequest(page, guestDisplayName);
await rejectGuestRequest(page, guestDisplayName);

// Verification
await verifyEventStatus(page, expectedStatus);
await verifyGuestJoined(page, guestDisplayName);

// Multi-user Setup
await setupHostGuestScenario(hostPage, guestPage, eventTitle);
```

**Smart Login Detection:**
```typescript
// Automatically detects if user is already logged in
const isLoggedIn = await checkLoginState(page);
if (!isLoggedIn) {
  await performLogin(page, email, password);
}
```

#### 2. `test-utilities.ts` - Test Data and Constants
**Purpose**: Test user credentials, event templates, and common test data.

**Test Users:**
```typescript
export const TEST_USERS = {
  HOST: {
    email: 'host@test.dev',
    password: 'password123',
    displayName: 'Ram'
  },
  GUEST: {
    email: 'guest@test.dev', 
    password: 'password123',
    displayName: 'Guest User'
  }
};
```

#### 3. Reusable Patterns

**Event Creation Pattern:**
```typescript
// Use this pattern for all event creation tests
await loginAsHost(page);
await createAndPublishEvent(page, 'Test Event', 'Description', '5', '20');
```

**Multi-User Pattern:**
```typescript
// Use this pattern for host-guest scenarios
await setupHostGuestScenario(hostPage, guestPage, 'Test Event');
```

**Filter Testing Pattern:**
```typescript
// Use this pattern for filter interactions
await page.getByTestId('filter-toggle-button').click();
await page.getByTestId('status-filter-option-upcoming').click();
```

## 📋 Pending Test Issues

### High Priority Issues
1. **Plans.spec.ts** - 2 failing tests
   - Promo code functionality test - missing validation message
   - Plan cancellation flow test - missing cancel subscription dialog

2. **UI Element Mismatches** - Multiple test files
   - Missing test IDs in some components
   - Incorrect selector expectations
   - React Native Web rendering differences

### Medium Priority Issues
1. **Multi-User Scenarios** - Item management and capacity limits
2. **Edge Cases** - Complex concurrent user actions
3. **Manual Event Creation** - Some tests still use manual patterns instead of utilities

### Low Priority Issues
1. **Subscription.spec.ts** - Missing UI elements
2. **Settings.spec.ts** - Minor UI element mismatches
3. **Test Refactoring** - Convert remaining manual patterns to utilities

### Known Limitations
1. **Supabase Cleanup** - No automated test data cleanup utilities
2. **Guest User Setup** - Currently using host credentials for guest tests
3. **Network Testing** - Limited offline scenario testing
4. **Performance Testing** - No performance benchmarks implemented

## 🔧 Test Data Management

### Current Test Data Strategy
- **Static Test Users**: Predefined users in `test-utilities.ts`
- **Dynamic Events**: Events created during test execution
- **No Cleanup**: Tests rely on app state management for cleanup

### Recommended Improvements
1. **Add Supabase Cleanup Utilities**:
```typescript
// Add to global-teardown.ts
async function cleanupTestData() {
  // Delete test events
  // Reset test user data
  // Clear test databases
}
```

2. **Implement Test Data Factories**:
```typescript
// Create test data factories for consistent test data
export const createTestEvent = (overrides = {}) => ({
  title: 'Test Event',
  description: 'Test Description',
  ...overrides
});
```

3. **Add Test Isolation**:
```typescript
// Ensure each test starts with clean state
beforeEach(async () => {
  await page.reload();
  await clearTestData();
});
```

## 📊 Test Results

Test results are saved in the `test-results/` directory:

- **Screenshots**: Visual evidence of test execution
- **Videos**: Recordings of failed tests
- **HTML Report**: Detailed test report
- **JSON Results**: Machine-readable test results
- **JUnit XML**: CI/CD integration format

## 🔧 Configuration

### Playwright Configuration

The `playwright.config.ts` file configures:

- **Test timeouts**: 120 seconds for complex scenarios
- **Browser projects**: Desktop, mobile, tablet
- **Retry logic**: 2 retries in CI, 0 in local
- **Parallel execution**: 4 workers locally, 2 in CI
- **Screenshots**: On failure only
- **Videos**: Retain on failure

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MOBILE_WEB_URL` | Mobile app URL | `http://localhost:8081` |
| `CI` | CI environment flag | `false` |
| `DEBUG` | Debug mode flag | `false` |

## 🐛 Debugging

### Running Tests in Debug Mode

```bash
# Run with debug output
DEBUG=true npm run test:playwright multi-user

# Run with headed browser
npx playwright test --headed

# Run specific test
npx playwright test multi-user-scenarios.spec.ts --grep "Host creates event"
```

### Common Issues

1. **Mobile app not running**: Ensure the app is accessible at the configured URL
   ```bash
   # Check if app is running
   curl -I http://localhost:8081
   
   # Start the app
   cd /workspace/apps/mobile
   npx expo start --web --port 8081
   ```

2. **JavaScript bundle errors**: Ensure all dependencies are installed
   ```bash
   # Install missing dependencies
   npm install react-native-gesture-handler
   npx playwright install
   ```

3. **Test users not found**: Create test users in the database
4. **Timeout errors**: Increase timeout values in configuration
5. **Flaky tests**: Check for race conditions and add proper waits
6. **TypeScript compilation errors**: Ensure all testID props are properly typed

## 📈 Best Practices

### Writing Tests

1. **Use test utilities**: Leverage helper functions for common operations
2. **Add proper waits**: Wait for elements to be visible before interacting
3. **Take screenshots**: Capture important test states
4. **Handle async operations**: Use proper await statements
5. **Clean up**: Close pages and contexts after tests

### Test Organization

1. **Group related tests**: Use describe blocks for logical grouping
2. **Use descriptive names**: Make test names clear and specific
3. **Keep tests independent**: Each test should be able to run alone
4. **Use setup/teardown**: Clean up test data between tests

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run test:playwright all
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: test-results/
```

### Jenkins

```groovy
pipeline {
  agent any
  stages {
    stage('Test') {
      steps {
        sh 'npm install'
        sh 'npm run test:playwright all'
      }
      post {
        always {
          publishHTML([
            allowMissing: false,
            alwaysLinkToLastBuild: true,
            keepAll: true,
            reportDir: 'test-results/html-report',
            reportFiles: 'index.html',
            reportName: 'Playwright Report'
          ])
        }
      }
    }
  }
}
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Test Automation Patterns](https://martinfowler.com/articles/practical-test-pyramid.html)
- [Mobile Testing Guide](https://playwright.dev/docs/emulation)

## 🤝 Contributing

When adding new tests:

1. Follow the existing test structure
2. Use test utilities for common operations
3. Add proper test IDs to new UI elements
4. Update this README if adding new test suites
5. Ensure tests are deterministic and reliable

### Adding Test IDs

When adding new UI components, ensure they have proper test IDs:

```typescript
// ✅ Good - Add testID to interactive elements
<Pressable testID="submit-button" onPress={handleSubmit}>
  <Text>Submit</Text>
</Pressable>

// ✅ Good - Add testID to form inputs
<TextInput testID="email-input" placeholder="Email" />

// ✅ Good - Add testID to containers for grouping
<View testID="form-container">
  {/* form content */}
</View>
```

### Test ID Naming Convention

- Use kebab-case: `submit-button`, `email-input`
- Be descriptive: `welcome-title`, `password-toggle`
- Group related elements: `form-email`, `form-password`, `form-submit`
- Use consistent prefixes: `auth-`, `event-`, `item-`

## 📞 Support

For questions or issues with the test suite:

1. Check the test results in `test-results/`
2. Review the Playwright documentation
3. Check for common issues in this README
4. Create an issue in the project repository
