# Changelog

## [Unreleased] - 2025-09-11

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
