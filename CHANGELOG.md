# Changelog

## [Unreleased] - 2025-09-19

### Added - User Profile & Settings Management System

#### Backend
- **User Profile API**: New REST endpoints for comprehensive profile management
  - `POST /api/v1/user-profile/setup` - Complete profile setup with display name, meal preferences, location, and discovery settings
  - `GET /api/v1/user-profile/me` - Fetch current user profile with coordinates extraction from PostGIS
  - Database migrations: `008_add_meal_preferences.sql` and `009_add_setup_completion_flag.sql`
  - Enhanced `user_profiles` table with `meal_preferences` (text[]) and `setup_completed` (boolean) columns
- **Coordinate Management**: PostGIS integration for location data
  - Automatic extraction of latitude/longitude from `home_geog` geography column
  - Fallback handling for missing coordinate data
- **API Documentation**: Updated OpenAPI spec with new user profile endpoints and schemas

#### Mobile (React Native / Expo)
- **Profile Setup Flow**: Multi-step onboarding system
  - Step 1: Display name entry
  - Step 2: Location services with city search (OpenStreetMap Nominatim API)
  - Step 3: Meal preferences selection with interactive tags
  - Step 4: Completion with data persistence
  - Back navigation between steps with proper state management
- **Settings Screen Enhancements**:
  - Real user name and email display (replaced hardcoded "John Doe")
  - New pages: About, Privacy & Security, Help & Support
  - Removed redundant "Settings > Notifications" (replaced by bell icon)
  - User Preferences integration with meal preferences display
- **User Preferences Screen**: Comprehensive preference management
  - Location search with debounced city suggestions
  - Meal preferences with interactive tag selection
  - Discovery radius configuration
  - Real-time data loading with loading states
- **Navigation Architecture**: Centralized navigation context system
  - Clean back button handling for all settings drill-down pages
  - Context-aware navigation (Settings → Any Page → Back = Returns to Settings)
  - Centralized `handleBackNavigation()` function for maintainable navigation logic
- **Loading States**: Consistent UI feedback across all screens
  - ActivityIndicator with branded colors and loading messages
  - Overlay loading states to prevent user interaction during data fetch
  - Timeout handling for hanging API calls (3-second timeout on auth sessions)

#### Database Schema Updates
- **User Profiles Table**: Enhanced with new columns
  - `meal_preferences`: Array of dietary preference strings
  - `setup_completed`: Boolean flag to track onboarding completion
  - `home_geog`: PostGIS geography column for location data
- **Migration Files**: 
  - `008_add_meal_preferences.sql` - Adds meal preferences column
  - `009_add_setup_completion_flag.sql` - Adds setup completion tracking

#### Technical Improvements
- **API Client**: Enhanced with timeout handling and error recovery
  - 3-second timeout on `supabase.auth.getSession()` calls
  - Graceful fallback when authentication fails
  - Improved error logging and debugging
- **State Management**: Centralized navigation context
  - Single `navigationContext` state instead of multiple boolean flags
  - Cleaner component architecture with decoupled navigation logic
  - Easier maintenance and extensibility for new pages
- **Error Handling**: Robust error recovery throughout the app
  - Hanging API call prevention with timeouts
  - Graceful fallbacks for missing data
  - User-friendly error messages and loading states

#### UI/UX Enhancements
- **Consistent Design**: Unified loading states and navigation patterns
  - ActivityIndicator with consistent styling across all screens
  - Loading overlays to prevent premature user interaction
  - Smooth navigation transitions with proper state management
- **User Experience**: Improved onboarding and settings flow
  - Clear step-by-step profile setup process
  - Intuitive back navigation that remembers context
  - Real-time feedback during data loading and saving
- **Accessibility**: Better user feedback and interaction patterns
  - Loading states prevent confusion during data operations
  - Clear visual feedback for user actions
  - Consistent navigation patterns across all screens

### Fixed - Critical Issues
- **Hanging API Calls**: Resolved infinite loading states
  - Added timeouts to prevent `supabase.auth.getSession()` from hanging
  - Implemented fallback mechanisms for failed authentication calls
  - Fixed "loading..." screen getting stuck on page refresh
- **Database Constraints**: Fixed null value violations
  - Resolved `null value in column "id"` error in user profile creation
  - Proper primary key handling in database upsert operations
- **Navigation Issues**: Fixed back button behavior
  - Settings drill-down pages now properly return to settings
  - Centralized navigation logic for maintainable code
  - Context-aware navigation that remembers where user came from
- **Data Persistence**: Fixed meal preferences and location data
  - Proper saving and loading of user preferences
  - Coordinate data extraction from PostGIS geography columns
  - Consistent data synchronization between database and UI

### Breaking Changes
None - All changes are additive and backward compatible.

### Migration Notes
1. Run database migrations: `008_add_meal_preferences.sql` and `009_add_setup_completion_flag.sql`
2. Update mobile app to use new profile setup flow
3. Configure OpenStreetMap Nominatim API for location search (no API key required)

---

## [Unreleased] - 2025-09-11

### Added - Notifications System

#### Backend
- DB: Added `007_notifications_extend.sql` with richer `notifications` table, `notification_preferences`, `push_tokens`, indexes and RLS
- Endpoints under `/api/v1/discovery`: inbox list with `status=unread`, unread count, mark read/mark all, push token register, preferences get/put
- Services: `notifications.service.ts` (createNotification, unread count, status filter, event cancel broadcast)
- Join Requests: notifications on approve/decline actions
- Push: stub delivery service, server logs deliveries; real push delivery can be integrated later
- Types: temporary shims for `@zodios/core` and `@payments/core` to keep TS builds green

#### Mobile (React Native / Expo)
- Header bell with unread badge in `EventList.tsx`
- Inbox in `NotificationsScreen.tsx`: fetch unread, mark-all-read, Supabase Realtime prepend on INSERT
- Expo push token registration (best-effort) calling server `/discovery/push/register`

### Added - Join Requests & Event Discovery System

#### Backend
- **Event Discovery**: Added public event search with filters (text, location, dietary preferences)
  - New query parameters: `q`, `dateFrom/dateTo`, `near`, `diet`, `is_public`
  - Enhanced `GET /events` endpoint for discovery vs. user events
- **Join Requests**: Complete join request workflow with capacity management
  - `POST /events/{eventId}/requests` - Create request with soft capacity hold (30min TTL)
  - `GET /events/{eventId}/requests` - Host-only paginated request listing
  - `PATCH /events/{eventId}/requests/{requestId}/{action}` - Approve/decline/waitlist/cancel
  - `POST /events/{eventId}/requests/{requestId}/extend` - Extend hold (optional)
- **Capacity System**: Real-time availability calculation
  - `GET /events/{eventId}/availability` - Returns total/confirmed/held/available
  - Atomic capacity checking during approval via stored procedure
  - Soft holds with configurable TTL (`JOIN_HOLD_TTL_MIN` environment variable)
- **Database Schema**: New tables and enhancements
  - `event_join_requests` table with RLS policies
  - Added `capacity_total`, `is_public` to events table  
  - Added `party_size` to participants table
  - Background job function `expire_join_request_holds()`
- **Notification System**: Stub implementation for join request events
  - Console-based notifier with typed payloads
  - Ready for integration with email/push providers

#### Frontend (React Native)
- **Discovery UI**: Enhanced event browsing with filters and availability
  - Search bar with text, location, and dietary filters
  - Availability badges showing capacity status
  - "Request to Join" button with capacity validation
- **Join Request Components**: 
  - `RequestToJoinButton` - Modal form with party size and note
  - `AvailabilityBadge` - Real-time capacity display with color coding
  - `JoinRequestsManager` - Host dashboard for request management
- **Event Management**: New "Requests" tab for hosts
  - Approve/decline/waitlist actions with confirmation dialogs
  - Hold expiration countdown and extend functionality
  - Status filtering and pagination
- **API Client**: New methods for join request operations
  - Comprehensive error handling with user-friendly messages
  - React hooks for availability, request creation, and management

#### Testing
- **Unit Tests**: Service layer validation for all join request operations
- **Integration Tests**: End-to-end API testing with Supertest
  - Request creation, capacity validation, duplicate prevention
  - Status transitions with proper authorization checks
  - Hold expiration and extension scenarios

#### Documentation  
- **Architecture**: Added "Event Discovery & Join Requests" section
  - Sequence diagrams for request workflow
  - Database schema documentation
  - Capacity management explanation
- **RLS Policies**: Documented join request security model
- **OpenAPI**: Complete specification updates with new endpoints and schemas

### Technical Details
- **New Modules**: `apps/server/src/modules/requests/` with schema/service/controller/routes
- **Database Migration**: `001_join_requests.sql` with helper functions and policies  
- **Environment Variables**: `JOIN_HOLD_TTL_MIN` for configurable hold duration
- **Error Codes**: Standardized error responses for capacity and authorization issues

### Breaking Changes
None - All changes are additive and backward compatible.

### Migration Notes
1. Run database migration: `001_join_requests.sql`
2. Apply RLS policies: `002_join_requests_policies.sql`  
3. Set environment variable: `JOIN_HOLD_TTL_MIN=30` (optional, defaults to 30 minutes)
4. Update frontend to use new join request components (optional)

---

## Previous Releases

### [0.2.0] - 2025-06-27
- Initial event and participant management system
- Basic CRUD operations for events and items
- Supabase integration with RLS policies
- React Native mobile client with core functionality

### [0.1.0] - 2025-06-01  
- Project initialization
- Basic authentication system
- Database schema design
- Development environment setup
