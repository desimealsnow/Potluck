# Potluck Mobile App - E2E Testing Documentation

## Overview
This document outlines all user flow paths and testing strategies for the Potluck mobile app built with React Native/Expo. The app allows users to create, manage, and participate in potluck events.

## Application Architecture

### Tech Stack
- **Framework**: React Native with Expo (~53.0.22)
- **Testing**: Jest (existing unit tests) + Playwright (E2E tests - to be implemented)
- **Authentication**: Supabase Auth
- **UI Components**: Custom components + React Native Paper
- **Navigation**: Screen-based navigation with state management
- **Backend**: REST API at `http://localhost:3000/api/v1`
- **Project Structure**: Feature-based organization with absolute imports
- **Import System**: Drag-and-drop workflow with config-only updates

### Project Structure
```
src/
├── core/                    # Core application logic
│   ├── config/             # Configuration files (Supabase, etc.)
│   └── navigation/          # Navigation setup
├── features/               # Feature-based modules
│   ├── auth/               # Authentication screens & logic
│   ├── events/             # Event management
│   ├── payments/           # Subscription & billing
│   ├── profile/            # User profile management
│   ├── notifications/      # Notification handling
│   └── debug/              # Debug utilities
├── shared/                 # Shared components & utilities
│   ├── components/         # Reusable UI components
│   │   ├── ui/             # Basic UI components
│   │   ├── forms/          # Form components
│   │   └── layout/         # Layout components
│   ├── hooks/              # Custom React hooks
│   ├── utils/              # Utility functions
│   ├── services/           # API services
│   └── types/              # TypeScript type definitions
└── assets/                 # Static assets
```

### Absolute Imports
The app uses absolute imports for better organization and drag-and-drop file movement:
- `@/features/*` - Feature-specific imports
- `@/shared/*` - Shared components and utilities
- `@/core/*` - Core application logic
- `@/ui` - UI components
- `@/config` - Configuration files

### Current Test Coverage
- **Unit Tests**: Jest with React Native Testing Library
- **E2E Tests**: Playwright with comprehensive test suite
- **Components Covered**: AvailabilityBadge, JoinRequestsManager, RequestToJoinButton, useJoinRequests hook, apiClient service
- **E2E Coverage**: Authentication, Event Management, Multi-user scenarios, UI interactions
- **Coverage Thresholds**: 80% lines, 75% branches, 80% functions, 80% statements

### E2E Test Architecture
- **Reusable Utilities**: Centralized event management and authentication functions
- **Smart Login Detection**: Automatic detection of existing login state
- **Sequential Execution**: Configured to prevent state corruption between tests
- **Cross-Platform Testing**: Desktop, mobile, and tablet configurations
- **Comprehensive Test IDs**: Reliable element selection across all UI components

---

## User Flow Paths & Test Scenarios

### 1. Authentication Flow

#### 1.1 Initial App Launch
- **Entry Point**: App.tsx → SupabaseAuthUI.tsx
- **Loading State**: Shows loading spinner while checking session
- **Authenticated**: Redirects to EventList
- **Unauthenticated**: Shows auth form

#### 1.2 User Registration
**Path**: SupabaseAuthUI → Sign Up Form
- Enter email address
- Enter password (min 6 characters)
- Confirm password
- Click "Sign Up" button
- Receive email confirmation
- Handle email verification

**Test Cases**:
- Valid registration with all fields
- Invalid email format
- Password too short
- Password mismatch
- Already registered email
- Network error handling

#### 1.3 User Login  
**Path**: SupabaseAuthUI → Sign In Form
- Enter email address
- Enter password
- Click "Sign In" button
- Navigate to EventList on success

**Test Cases**:
- Valid login credentials
- Invalid email/password
- Empty fields validation
- "Remember me" functionality
- Network error handling

#### 1.4 Password Reset
**Path**: SupabaseAuthUI → Forgot Password
- Enter email address
- Click "Forgot Password"
- Receive reset email
- Follow reset link

**Test Cases**:
- Valid email reset request
- Invalid email format
- Non-existent email
- Reset link functionality

### 2. Main Navigation Flow

#### 2.1 Event List (Dashboard)
**Entry Point**: EventListWithNavigation.tsx (main screen after authentication with React Navigation)

**Features**:
- Search events
- Filter by status (Upcoming, Drafts, Past, Deleted)
- Filter by ownership (All, Mine, Invited)  
- Filter by diet (Veg, Non-veg, Mixed)
- Pagination with infinite scroll
- Pull-to-refresh

**Navigation Options**:
- Create Event (+)
- Plans (card icon)
- Settings (settings icon) 
- Logout (log-out icon)

**Test Cases**:
- Load and display events list
- Search functionality
- All filter combinations
- Pagination behavior
- Refresh functionality
- Empty states
- Error handling

### 3. Event Management Flows

#### 3.1 Create Event Flow
**Path**: EventList → CreateEventScreen (4-step wizard)

##### Step 1: Event Details
- Event title (required, min 2 chars)
- Description (optional)
- Date picker (required)
- Time picker (required)
- Min/Max guests (required, max >= min)
- Meal type selection (Veg, Non-veg, Mixed)

##### Step 2: Location Selection
- Location search input
- Popular locations list
- Location confirmation with coordinates
- Required to proceed

##### Step 3: Menu Planning
- Add dishes with name, category, per-guest quantity
- Categories: Main Course, Starter, Dessert
- Multiple dish management
- Remove dishes
- Menu summary calculation

##### Step 4: Participant Planning & Review
- Add participant emails
- Event summary review
- Create event as draft
- Option to publish immediately

**Test Cases**:
- Complete happy path through all steps
- Required field validation at each step
- Navigation between steps
- Data persistence across steps
- Location search functionality
- Menu calculations
- Participant email validation
- Create vs Publish options

#### 3.2 Event Details & Management
**Path**: EventList → EventDetailsPage

**Tabs**:
1. **Overview**: RSVP, notes, host info, event details
2. **Items**: Menu items with claim/unclaim functionality
3. **Participants**: Participant management (via ParticipantsScreen)
4. **Requests**: Join request management (host only)

**Host Actions** (based on event status):
- **Draft**: Publish, Delete
- **Published**: Cancel, Complete  
- **Cancelled**: Delete
- **Deleted**: Restore
- **Completed**: No actions

**Test Cases**:
- View event details in all states
- Tab navigation
- RSVP functionality
- Item claiming/unclaiming
- Host action buttons
- Status-based UI changes
- Participant management
- Join request handling

### 4. Settings & Account Management

#### 4.1 Settings Flow
**Path**: EventList → SettingsScreen

**Options**:
- Subscription management
- Notifications
- Privacy & Security  
- Help & Support
- About
- Sign Out

**Test Cases**:
- Navigation to each settings section
- Sign out confirmation
- Settings persistence

#### 4.2 Subscription Management
**Path**: SettingsScreen → SubscriptionScreen

**Features**:
- Current subscription display
- Plan management
- Invoice history
- Payment method updates
- Cancellation

**Test Cases**:
- Display current plan
- Plan upgrade/downgrade
- Payment processing
- Invoice downloads
- Cancellation flow

#### 4.3 Plans & Billing
**Path**: EventList → PlansScreen

**Features**:
- Monthly/Yearly toggle
- Plan comparison
- Payment processing
- Promo code application
- FAQ section

**Test Cases**:
- Plan selection
- Billing cycle toggle  
- Payment flow
- Promo code validation
- Current plan indicators

### 5. Component-Level Interactions

#### 5.1 Join Requests (Host View)
**Components**: JoinRequestsManager, RequestToJoinButton, AvailabilityBadge

**Features**:
- View join requests
- Approve/deny requests
- Availability status management

#### 5.2 Payment Components  
**Components**: PlanCard, InvoiceCard, PaymentStatusBadge

**Features**:
- Plan selection and display
- Payment status indicators
- Invoice management

#### 5.3 Form Components
**Components**: Stepper, FoodOption, Input, Button, etc.

**Features**:
- Multi-step form navigation
- Input validation
- Interactive selections

---

## Cross-Platform Considerations

### React Native Specific Testing
- **Platform Differences**: iOS vs Android behavior
- **Navigation**: Screen-based navigation without URLs
- **Alerts**: Platform-specific alert dialogs (Alert.alert vs window.confirm)
- **Touch Interactions**: Pressable components vs click events
- **Virtual Keyboard**: Input field interactions

### Web Compatibility
- Some components have web fallbacks (window.confirm)
- Responsive design considerations
- Web-specific styling

---

## Data Flow & State Management

### API Integration
- **Base URL**: `http://localhost:3000/api/v1`
- **Authentication**: Supabase session tokens
- **Error Handling**: Consistent error messaging
- **Optimistic Updates**: UI updates before API confirmation

### Mock vs Real Data
- Mock APIs available for offline testing
- Environment switching capability
- Test data management

---

## Testing Strategy

### E2E Test Organization
```
tests/
├── fixtures/           # Test data and mock responses
├── pages/             # Page Object Model classes  
├── specs/             # Test specifications
│   ├── auth/          # Authentication tests
│   ├── events/        # Event management tests
│   ├── settings/      # Settings and profile tests
│   └── payments/      # Payment and billing tests
└── utils/             # Test utilities and helpers
```

### Test Priorities

#### High Priority (P0)
1. User authentication (login/register)
2. Event creation and management
3. Event list and navigation
4. Critical user actions (RSVP, join requests)

#### Medium Priority (P1) 
1. Settings management
2. Payment flows
3. Search and filtering
4. Participant management

#### Low Priority (P2)
1. Edge cases and error scenarios
2. Performance testing
3. Accessibility testing
4. Cross-platform consistency

### Test Data Strategy
- **Static Test Users**: Predefined users in `test-utilities.ts`
- **Dynamic Events**: Events created during test execution
- **Reusable Templates**: Event and user data factories
- **Mock Payment Responses**: LemonSqueezy integration (sandbox mode)
- **Cleanup Procedures**: Manual cleanup (Supabase cleanup utilities needed)

### Test Data Management

#### Current Approach
- **Test Users**: Static credentials defined in `test-utilities.ts`
- **Event Data**: Created dynamically during test execution
- **Cleanup**: Relies on app state management and page reloads
- **Isolation**: Tests use `beforeEach` hooks for clean state

#### Supabase Cleanup Status
**Current State**: No automated Supabase cleanup utilities implemented

**Available Files**:
- `global-teardown.ts` - Placeholder for cleanup logic
- `global-setup.ts` - Test environment setup

**Recommended Implementation**:
```typescript
// Add to global-teardown.ts
async function cleanupTestData() {
  // Connect to Supabase
  const supabase = createClient(url, key);
  
  // Delete test events
  await supabase.from('events').delete().like('title', 'Test%');
  
  // Reset test user data
  await supabase.from('profiles').update({...}).eq('email', 'host@test.dev');
  
  // Clear test databases
  await supabase.from('join_requests').delete().like('event_id', '%');
}
```

#### Test Data Factories
```typescript
// Recommended pattern for consistent test data
export const createTestEvent = (overrides = {}) => ({
  title: 'Test Event',
  description: 'Test Description',
  min_guests: 5,
  max_guests: 20,
  ...overrides
});

export const createTestUser = (overrides = {}) => ({
  email: 'test@example.com',
  password: 'password123',
  displayName: 'Test User',
  ...overrides
});
```

---

## Implementation Notes

### TestIds Required
All interactive elements need testIds for reliable element selection:
- Navigation elements
- Form inputs and buttons  
- Interactive cards and lists
- Modal dialogs and alerts
- Status indicators and badges

### Environment Setup
- Local development server running
- Test database with known data
- Mock payment provider setup
- Email testing service

### CI/CD Integration
- Automated test execution
- Screenshot capture on failures
- Test result reporting
- Performance metrics

---

## Running Tests

### Prerequisites
1. **Start the development server:**
   ```bash
   npm run web
   ```
   The app should be running at `http://localhost:8081`

2. **Install Playwright browsers:**
   ```bash
   npx playwright install
   ```

### Running Playwright Tests

#### Basic Commands
```bash
# Run all E2E tests
npm run test:e2e

# Run tests with browser visible
npm run test:e2e:headed

# Debug tests step by step
npm run test:e2e:debug

# Run with Playwright UI
npm run test:e2e:ui

# View test reports
npm run test:e2e:report
```

#### Running Specific Tests
```bash
# Run specific test file
npx playwright test auth.spec.ts

# Run specific test by name
npx playwright test -g "should login successfully"

# Run tests in specific project (browser)
npx playwright test --project=chromium
```

#### Test Environment Variables
```bash
# Custom mobile web URL (default: http://localhost:8081)
MOBILE_WEB_URL=http://localhost:3000 npm run test:e2e
```

### Test Structure

```
tests/ui/
├── auth.spec.ts                 # Authentication flow tests
├── event-list.spec.ts          # Events dashboard and filtering
├── create-event.spec.ts        # Event creation wizard
├── event-details.spec.ts       # Event management and details
├── settings.spec.ts            # Settings and profile management
├── plans.spec.ts               # Billing and subscription plans
├── subscription.spec.ts        # Payment flow integration
└── complete-user-journey.spec.ts # End-to-end user scenarios
```

### Test Data
- **Test User**: `host@test.dev` / `password123`
- **Test Events**: Created dynamically during tests
- **Mock Payment**: LemonSqueezy integration (sandbox mode)

### Screenshots and Artifacts
All test artifacts are saved to `test-results/`:
- Screenshots on failure
- Videos for failed tests  
- Test reports and traces
- Step-by-step debug screenshots

### Debugging Failed Tests
1. **View HTML Report**: `npm run test:e2e:report`
2. **Run in Debug Mode**: `npm run test:e2e:debug`
3. **Check Screenshots**: Look in `test-results/` folder
4. **Enable Tracing**: Set `trace: 'on'` in config for detailed steps

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - name: Install dependencies
        run: npm install
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Start app
        run: npm run web &
      - name: Wait for app
        run: npx wait-on http://localhost:8081
      - name: Run tests
        run: npm run test:e2e
      - name: Upload artifacts
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results/
```

## Next Steps

1. ✅ **Setup Playwright configuration**
2. ✅ **Add testIds to all components** 
3. ✅ **Create comprehensive test suites**
4. ⏳ **Implement Page Object Model for better maintainability**
5. ⏳ **Add visual regression testing**
6. ⏳ **Setup CI/CD pipeline**
7. ⏳ **Add performance testing**
8. ⏳ **Mobile-specific gesture testing**

---

*Last Updated: December 2024*
*Author: Senior Playwright Developer*

## Deep Link & Universal/App Links

- iOS: Associated Domains configured in `app.json` under `ios.associatedDomains` (e.g., `applinks:potluck.example.com`).
- Android: Intent filter for `https://potluck.example.com/events/*` configured in `app.json`.
- App routing: `SupabaseAuthUI` listens for `potluck://event/{eventId}` and opens `EventDetailsPage`.
- Server landing: Hitting `https://<public-base>/events/{eventId}` returns a minimal HTML page that attempts to open the deep link and shows an Open App button.
- Test:
  - iOS: `xcrun simctl openurl booted potluck://event/<id>`
  - Android: `adb shell am start -a android.intent.action.VIEW -d "https://potluck.example.com/events/<id>"`
