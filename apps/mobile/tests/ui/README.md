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

**Last Updated**: September 27, 2024

### What's Working
- ✅ **Authentication tests** - All login/signup flows working
- ✅ **Test ID coverage** - Comprehensive testID attributes added to all UI components
- ✅ **TypeScript compilation** - All type errors resolved
- ✅ **JavaScript bundle** - App loads successfully in browser
- ✅ **Playwright configuration** - Multi-browser testing setup complete

### Recent Fixes
- **Fixed missing dependency**: Added `react-native-gesture-handler` for web compatibility
- **Added testID support**: Updated Card, Chip, ProgressBar components to support testID props
- **Resolved TypeScript errors**: Fixed import conflicts and type definitions
- **Enhanced authentication UI**: Added comprehensive test IDs to auth forms
- **Updated component interfaces**: All UI components now support testID attributes

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

### Authentication Flows

Tests user authentication and validation:

- **Login Flow**: Valid credentials, invalid credentials, empty fields
- **Signup Flow**: New user registration, email validation, password requirements
- **Form Validation**: Real-time validation feedback, error messages
- **Password Toggle**: Show/hide password functionality
- **Mode Switching**: Toggle between login and signup modes
- **Forgot Password**: Password reset functionality

### Multi-User Scenarios

Tests realistic host-guest interactions:

- **Happy Path**: Host creates event → Guest requests → Host approves → Guest joins
- **Rejection Path**: Host creates event → Guest requests → Host rejects
- **Event Cancellation**: Host cancels event after guest joins
- **Item Management**: Host and guest manage items together
- **Capacity Limits**: Test waitlist functionality when event is full

### Event Lifecycle

Tests complete event management:

- **Draft → Published → Completed**: Full event lifecycle
- **Event Cancellation**: Cancel published events
- **Event Deletion**: Delete and restore events
- **Status Transitions**: Test all event status changes

### Join Request Workflows

Tests guest joining process:

- **Request → Approve → Join**: Complete approval workflow
- **Request → Reject**: Rejection workflow
- **Waitlist Management**: Handle capacity overflow
- **Bulk Operations**: Manage multiple requests

### Item Management

Tests item claiming and management:

- **Host Item Management**: Add, edit, delete items
- **Guest Item Claiming**: Claim and unclaim items
- **Progress Tracking**: Monitor item completion
- **Category Management**: Organize items by category

### Edge Cases

Tests error handling and edge cases:

- **Capacity Limits**: Handle event overflow
- **Network Issues**: Offline behavior and recovery
- **Invalid Data**: Validation error handling
- **Concurrent Actions**: Race condition handling
- **Data Persistence**: Recovery after crashes

## 🛠️ Test Utilities

The `test-utilities.ts` file provides helper functions for common test operations:

```typescript
import { PotluckTestUtils, TEST_USERS, TEST_EVENTS } from './test-utilities';

// Create test utilities
const utils = new PotluckTestUtils(page);

// Login as host
await utils.login(TEST_USERS.HOST);

// Create event
const eventId = await utils.createEvent(TEST_EVENTS.BASIC);

// Add items
await utils.addItem(TEST_ITEMS.MAIN_COURSE);

// Claim items
await utils.claimItem(0);
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
