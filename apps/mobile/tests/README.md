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

### Current Test Coverage
- **Unit Tests**: Jest with React Native Testing Library
- **Components Covered**: AvailabilityBadge, JoinRequestsManager, RequestToJoinButton, useJoinRequests hook, apiClient service
- **Coverage Thresholds**: 80% lines, 75% branches, 80% functions, 80% statements

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
**Entry Point**: EventList.tsx (main screen after authentication)

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
- Consistent test users and credentials
- Reusable event templates
- Mock payment responses
- Cleanup procedures

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

## Next Steps

1. ✅ **Setup Playwright configuration**
2. ✅ **Add testIds to all components** 
3. ✅ **Implement Page Object Model**
4. ✅ **Create authentication test suite**
5. ✅ **Develop event management tests**
6. ✅ **Add visual regression testing**
7. ✅ **Setup CI/CD pipeline**

---

*Last Updated: December 2024*
*Author: Senior Playwright Developer*