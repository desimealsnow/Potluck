# Potluck - Event Management Platform

A comprehensive event management platform built with React Native (Expo) and Node.js, featuring real-time notifications, user profiles, location-based discovery, and subscription management.

## 🤖 For AI Agents

> **IMPORTANT**: If you're an AI agent, start by reading **[`docs/agent/README.md`](docs/agent/README.md)** for complete project context and file priorities.

## 🚀 Features

### Core Functionality
- **Event Management**: Create, manage, and discover events with full CRUD operations
- **User Profiles**: Comprehensive profile setup with meal preferences and location settings
- **Real-time Notifications**: Bell icon notification system with unread count tracking
- **Location Services**: City search with OpenStreetMap integration and discovery radius
- **Subscription Management**: Integrated billing system with multiple payment providers
- **Join Requests**: Event discovery and join request workflow with capacity management

### User Experience
- **Multi-step Onboarding**: Guided profile setup with location and preference configuration
- **Settings Management**: Centralized settings with About, Privacy, Help, and Preferences pages
- **Navigation Architecture**: Context-aware navigation with proper back button handling
- **Loading States**: Consistent UI feedback with ActivityIndicators and loading overlays
- **Error Handling**: Robust error recovery with timeouts and graceful fallbacks

## 🏗️ Architecture

### Backend (Node.js + Express)
- **REST API**: Comprehensive API with OpenAPI documentation
- **Database**: PostgreSQL with PostGIS for location data
- **Authentication**: Supabase Auth with JWT tokens
- **Real-time**: Supabase Realtime for live updates
- **Payments**: LemonSqueezy integration for subscription management

### Frontend (React Native + Expo)
- **Cross-platform**: iOS and Android support via Expo
- **State Management**: React hooks with centralized navigation context
- **UI Components**: Custom components with consistent design system
- **Location Services**: Expo Location with OpenStreetMap Nominatim API
- **Push Notifications**: Expo Notifications for real-time alerts

### Database Schema
- **Events**: Event management with capacity and public/private settings
- **User Profiles**: Enhanced profiles with meal preferences and setup completion tracking
- **Notifications**: Real-time notification system with read/unread status
- **Join Requests**: Event discovery and join request workflow
- **Subscriptions**: Billing and subscription management

## 📱 Recent Updates (v2025-09-19)

### User Profile & Settings Management
- ✅ **Profile Setup Flow**: Multi-step onboarding with display name, location, and meal preferences
- ✅ **Settings Enhancement**: Real user data display, new About/Privacy/Help pages
- ✅ **User Preferences**: Comprehensive preference management with location search
- ✅ **Navigation Architecture**: Centralized navigation context for clean back button handling
- ✅ **Loading States**: Consistent UI feedback across all screens

### Event Management & Search
- ✅ **Search Functionality**: Fixed backend search filtering for event titles and descriptions
- ✅ **Event Sorting**: Consistent descending order by event date across all search modes
- ✅ **Date Validation**: Future-only event creation with frontend and backend validation
- ✅ **Nearby Search**: Dynamic location-based filtering using user's actual coordinates
- ✅ **Radius Control**: Interactive radius adjustment (1-100km) for nearby event discovery

### UI/UX Improvements
- ✅ **Search Interface**: Redesigned search bar with clear button and results counter
- ✅ **Empty States**: Helpful no-results messages with clear search actions
- ✅ **Loading Feedback**: Consistent ActivityIndicator styling across all screens
- ✅ **Navigation Flow**: Context-aware back button navigation for all settings pages

### Critical Fixes
- ✅ **Hanging API Calls**: Resolved infinite loading states with timeout handling
- ✅ **Database Constraints**: Fixed null value violations in user profile creation
- ✅ **Navigation Issues**: Fixed back button behavior for settings drill-down pages
- ✅ **Data Persistence**: Fixed meal preferences and location data synchronization
- ✅ **Search Filtering**: Fixed backend search query processing for event discovery
- ✅ **401 Unauthorized Errors**: Fixed duplicate API calls causing authentication failures

## 🔧 Technical Implementation Summary

### Backend Enhancements
- **Search API**: Added text search filtering in `performTraditionalSearch` function
- **Date Validation**: Server-side validation for future-only event creation
- **Location Services**: Enhanced PostGIS integration for coordinate-based filtering
- **API Client**: Added 3-second timeout to prevent hanging authentication calls

### Frontend Improvements
- **Search UI**: Custom TextInput with clear button and real-time results counter
- **Navigation**: Centralized `handleBackNavigation` function for context-aware routing
- **Location Integration**: Dynamic nearby filtering using user's profile coordinates
- **Date Picker**: Future-only date selection with comprehensive validation
- **Loading States**: Consistent ActivityIndicator styling with proper error handling
- **API Architecture**: Centralized data fetching to prevent duplicate calls and 401 errors

### Database Schema Updates
- **User Profiles**: Added `meal_preferences` (text[]) and `setup_completed` (boolean) columns
- **Migrations**: `008_add_meal_preferences.sql` and `009_add_setup_completion_flag.sql`
- **PostGIS**: Enhanced coordinate extraction from `home_geog` geography column

### Key Features Added
1. **Multi-step Profile Setup**: Guided onboarding with location and preference configuration
2. **Smart Search**: Real-time filtering with debounced input and results feedback
3. **Location Discovery**: Radius-based event filtering using user's actual coordinates
4. **Navigation Context**: Clean back button handling that remembers navigation source
5. **Comprehensive Validation**: Both frontend and backend validation for data integrity
6. **Centralized Data Flow**: Single API call pattern to prevent authentication conflicts

## 🏛️ Architecture Improvements

### API Call Optimization
- **Single Source of Truth**: User location data is fetched once in `SupabaseAuthUI` and passed as props
- **No Duplicate Calls**: Eliminated duplicate `/user-profile/me` calls that were causing 401 errors
- **Proper Authentication Flow**: API calls only made after user authentication is fully established
- **Centralized Data Management**: Parent component manages shared state and passes data to children

### Error Prevention
- **Timeout Handling**: 3-second timeout on authentication calls to prevent hanging
- **Graceful Fallbacks**: Proper error handling with fallback to user metadata when API fails
- **Silent Error Handling**: 401 errors handled silently as they're expected during auth flow
- **Loading States**: Proper loading indicators to prevent UI flashing

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ with PostGIS
- Supabase account
- Expo CLI

### Backend Setup
```bash
cd apps/server
npm install
cp .env.example .env
# Configure your environment variables
npm run dev
```

### Mobile Setup
```bash
cd apps/mobile
npm install
npx expo start
```

### Database Setup
```bash
# Run migrations
psql -d your_database -f apps/server/db/migrations/008_add_meal_preferences.sql
psql -d your_database -f apps/server/db/migrations/009_add_setup_completion_flag.sql
```

## 📚 Documentation

- [API Documentation](docs/api-spec.yaml) - Complete OpenAPI specification
- [Architecture Guide](docs/architecture.md) - System architecture and design decisions
- [Deployment Guide](docs/deployment.md) - Production deployment instructions
- [Changelog](CHANGELOG.md) - Detailed change history

## 🧪 Testing

### Backend Tests
```bash
cd apps/server
npm test
```

### Mobile Tests
```bash
cd apps/mobile
npm test
```

### E2E Tests
```bash
cd apps/mobile
npx playwright test
```

## 🔧 Configuration

### Environment Variables
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `JOIN_HOLD_TTL_MIN` - Join request hold duration (default: 30 minutes)

### Database Migrations
All database changes are managed through migration files in `apps/server/db/migrations/`.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the [documentation](docs/)
- Review the [changelog](CHANGELOG.md)
- Open an issue on GitHub

---

**Built with ❤️ using React Native, Node.js, and Supabase**
