# Potluck Test Utilities Guide

## Overview

This guide documents the reusable test utilities and patterns developed for the Potluck E2E test suite. These utilities provide consistent, maintainable, and reliable test automation across all test scenarios.

## 🏗️ Architecture

### Core Utility Files

1. **`event-test-utilities.ts`** - Event management and authentication utilities
2. **`test-utilities.ts`** - Test data constants and user credentials
3. **`global-setup.ts`** - Test environment initialization
4. **`global-teardown.ts`** - Test cleanup (placeholder for Supabase cleanup)

### Design Principles

- **Reusability**: Common operations encapsulated in utility functions
- **Consistency**: Standardized patterns across all test files
- **Maintainability**: Centralized logic for easy updates
- **Reliability**: Robust error handling and state management
- **Smart Detection**: Automatic detection of existing states

## 🔐 Authentication Utilities

### Smart Login System

The authentication system includes intelligent detection to avoid redundant login attempts:

```typescript
// Smart login detection
export async function loginUser(page: Page, email: string, password: string, userType: string) {
  // Navigate to app root
  await page.goto('/');
  
  // Wait for page to load
  await page.waitForTimeout(1000);
  
  // Check if already logged in
  const eventsHeader = page.getByTestId('events-header');
  const eventCards = page.locator('[data-testid^="event-card-"]');
  
  const isLoggedIn = await eventsHeader.isVisible() || (await eventCards.count()) > 0;
  
  if (isLoggedIn) {
    console.log(`✅ ${userType} already logged in, skipping login`);
    return;
  }
  
  // Perform login if not already logged in
  await performLogin(page, email, password, userType);
}
```

### Available Authentication Functions

```typescript
// Host login
await loginAsHost(page);

// Guest login (with guest number)
await loginAsGuest(page, 1);

// Generic login with custom credentials
await loginUser(page, 'custom@test.dev', 'password123', 'Custom User');
```

## 🎉 Event Management Utilities

### Event Creation

```typescript
// Complete event creation and publishing
await createAndPublishEvent(page, 'Event Title', 'Description', '5', '20');

// Step-by-step event creation
await createEvent(page, 'Event Title', 'Description', '5', '20');
await publishEvent(page);
```

### Event Lifecycle Management

```typescript
// Cancel an event
await cancelEvent(page);

// Delete an event
await deleteEvent(page);

// Verify event status
await verifyEventStatus(page, 'published');
```

### Event Details Navigation

```typescript
// Navigate to event details
await navigateToEventDetails(page, eventId);

// Navigate back to events list
await navigateToEventsList(page);
```

## 👥 Multi-User Scenarios

### Host-Guest Setup

```typescript
// Complete host-guest scenario setup
await setupHostGuestScenario(hostPage, guestPage, 'Test Event');
```

### Guest Operations

```typescript
// Request to join event
await requestToJoinEvent(page, eventId);

// Approve guest request (host)
await approveGuestRequest(page, 'Guest Name');

// Reject guest request (host)
await rejectGuestRequest(page, 'Guest Name');

// Verify guest joined
await verifyGuestJoined(page, 'Guest Name');
```

## 🔍 Verification Utilities

### Event Status Verification

```typescript
// Check event status
await verifyEventStatus(page, 'published');
await verifyEventStatus(page, 'cancelled');
await verifyEventStatus(page, 'draft');
```

### UI Element Verification

```typescript
// Check if element is visible
await expect(page.getByTestId('events-header')).toBeVisible();

// Check element count
const eventCount = await page.locator('[data-testid^="event-card-"]').count();
expect(eventCount).toBeGreaterThan(0);
```

## 🎛️ Filter and Search Utilities

### Filter Operations

```typescript
// Open filters
await page.getByTestId('filter-toggle-button').click();

// Apply status filter
await page.getByTestId('status-filter-option-upcoming').click();

// Apply ownership filter
await page.getByTestId('ownership-mine').click();

// Apply dietary filter
await page.getByTestId('diet-filter-veg').click();
```

### Search Operations

```typescript
// Search for events
await page.getByTestId('search-input').fill('search term');
await page.getByTestId('search-button').click();
```

## 📊 Test Data Management

### Test Users

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

### Event Templates

```typescript
export const TEST_EVENTS = {
  BASIC: {
    title: 'Basic Test Event',
    description: 'A basic test event',
    minGuests: '5',
    maxGuests: '20'
  },
  LARGE: {
    title: 'Large Test Event',
    description: 'A large test event',
    minGuests: '50',
    maxGuests: '100'
  }
};
```

## 🛠️ Common Patterns

### Test Setup Pattern

```typescript
test('Test description', async ({ page }) => {
  // 1. Login
  await loginAsHost(page);
  
  // 2. Perform test actions
  await createAndPublishEvent(page, 'Test Event', 'Description');
  
  // 3. Verify results
  await verifyEventStatus(page, 'published');
});
```

### Multi-User Test Pattern

```typescript
test('Multi-user scenario', async ({ browser }) => {
  // 1. Create browser contexts
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const guestPage = await guestContext.newPage();
  
  // 2. Setup scenario
  await setupHostGuestScenario(hostPage, guestPage, 'Test Event');
  
  // 3. Perform interactions
  await requestToJoinEvent(guestPage, eventId);
  await approveGuestRequest(hostPage, 'Guest Name');
  
  // 4. Cleanup
  await hostContext.close();
  await guestContext.close();
});
```

### Error Handling Pattern

```typescript
test('Error handling', async ({ page }) => {
  try {
    await loginAsHost(page);
    await createAndPublishEvent(page, 'Test Event', 'Description');
  } catch (error) {
    console.log('Test error:', error);
    await page.screenshot({ path: 'error-screenshot.png' });
    throw error;
  }
});
```

## 🔧 Configuration

### Playwright Configuration

```typescript
// playwright.config.ts
export default defineConfig({
  workers: 1, // Sequential execution
  reporter: 'list', // Console output
  timeout: 120000, // 2 minutes per test
  expect: {
    timeout: 10000 // 10 seconds for assertions
  }
});
```

### Test Environment Variables

```bash
# Mobile app URL
MOBILE_WEB_URL=http://localhost:8081

# Test environment
NODE_ENV=test

# Debug mode
DEBUG=false
```

## 🚨 Error Handling

### Common Error Scenarios

1. **Login Failures**: Smart detection prevents redundant login attempts
2. **Element Not Found**: Comprehensive test ID coverage and proper waits
3. **Timeout Issues**: Appropriate timeout values and retry logic
4. **State Corruption**: Sequential execution and page reloads

### Debugging Utilities

```typescript
// Take screenshot on failure
await page.screenshot({ path: 'debug-screenshot.png' });

// Log current page state
console.log('Current URL:', page.url());
console.log('Page title:', await page.title());

// Check element visibility
const isVisible = await page.getByTestId('element').isVisible();
console.log('Element visible:', isVisible);
```

## 📈 Best Practices

### Writing Tests

1. **Use Utilities**: Always use utility functions for common operations
2. **Descriptive Names**: Use clear, descriptive test names
3. **Proper Waits**: Wait for elements to be visible before interacting
4. **Error Handling**: Include proper error handling and debugging
5. **Cleanup**: Ensure proper cleanup after tests

### Maintaining Utilities

1. **Single Responsibility**: Each utility function has one clear purpose
2. **Error Handling**: Include comprehensive error handling
3. **Documentation**: Document all utility functions
4. **Testing**: Test utility functions independently
5. **Version Control**: Track changes to utility functions

## 🔄 Future Improvements

### Planned Enhancements

1. **Supabase Cleanup**: Implement automated test data cleanup
2. **Test Data Factories**: Create data factories for consistent test data
3. **Performance Testing**: Add performance benchmarks
4. **Visual Regression**: Implement visual regression testing
5. **API Testing**: Add API-level testing utilities

### Recommended Additions

```typescript
// Supabase cleanup utility
export async function cleanupTestData() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  
  // Delete test events
  await supabase.from('events').delete().like('title', 'Test%');
  
  // Reset test users
  await supabase.from('profiles').update({...}).eq('email', 'host@test.dev');
}

// Test data factory
export const createTestEvent = (overrides = {}) => ({
  title: 'Test Event',
  description: 'Test Description',
  min_guests: 5,
  max_guests: 20,
  ...overrides
});
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Test Automation Patterns](https://martinfowler.com/articles/practical-test-pyramid.html)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)
- [E2E Testing Best Practices](https://docs.cypress.io/guides/references/best-practices)

---

*Last Updated: December 2024*
*Author: Potluck Test Team*
