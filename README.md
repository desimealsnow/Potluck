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

### Project Structure
```
apps/mobile/
├── src/
│   ├── core/                    # Core application logic
│   │   ├── config/             # Configuration files (Supabase, etc.)
│   │   └── navigation/          # Navigation setup
│   ├── features/               # Feature-based modules
│   │   ├── auth/               # Authentication screens & logic
│   │   ├── events/             # Event management
│   │   ├── payments/           # Subscription & billing
│   │   ├── profile/            # User profile management
│   │   ├── notifications/      # Notification handling
│   │   └── debug/              # Debug utilities
│   ├── shared/                 # Shared components & utilities
│   │   ├── components/         # Reusable UI components
│   │   │   ├── ui/             # Basic UI components
│   │   │   ├── forms/          # Form components
│   │   │   └── layout/         # Layout components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Utility functions
│   │   ├── services/           # API services
│   │   └── types/              # TypeScript type definitions
│   └── assets/                 # Static assets
├── tsconfig.json               # TypeScript configuration with path mappings
├── metro.config.js            # Metro bundler configuration
├── babel.config.js            # Babel transpilation configuration
└── package.json               # Dependencies and scripts
```

### Absolute Imports System
The project uses a comprehensive absolute import system that enables:
- **Drag-and-drop file movement**: Move files between directories by updating only configuration files
- **No barrel exports**: Direct file imports without index.ts barrel files
- **Feature-based organization**: Clear separation of concerns by feature
- **TypeScript support**: Full IntelliSense and type checking for all aliases

### Database Schema
- **Events**: Event management with capacity and public/private settings
- **User Profiles**: Enhanced profiles with meal preferences and setup completion tracking
- **Notifications**: Real-time notification system with read/unread status
- **Join Requests**: Event discovery and join request workflow
- **Subscriptions**: Billing and subscription management

## 📱 Recent Updates (v2025-01-20)

### Project Structure & Development Experience
- ✅ **Absolute Imports**: Complete migration from relative to absolute imports across the entire codebase
- ✅ **Feature-Based Architecture**: Reorganized code into feature-based structure (`src/features/`, `src/shared/`, `src/core/`)
- ✅ **Drag-and-Drop Workflow**: Configured aliases to enable file movement with only config updates
- ✅ **TypeScript Path Mapping**: Comprehensive path mappings in `tsconfig.json` for all features and shared components
- ✅ **Metro & Babel Configuration**: Updated bundler configurations to support absolute imports
- ✅ **ESLint Optimization**: Streamlined ESLint rules for React Native development

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

#### Mobile environment flags (Expo)
- Public runtime flags must be exposed via Expo config `extra`.
- This repo maps `.env` → `extra` in `apps/mobile/app.config.ts`.

Bypass phone verification for testing:

1) Set in `.env` (repo root or `apps/mobile/.env` depending on your setup):
```
BYPASS_PHONE_VALIDATION=TEST
```
2) The config exposes this as `extra.EXPO_PUBLIC_BYPASS_PHONE_VALIDATION` at runtime.
3) Start Expo with cache clear (required after env/config changes):
```bash
cd apps/mobile
npx expo start -c
# or
npm run start -- --clear
```
4) The mobile app reads the flag via `expo-constants` in `EventList.tsx` and enables Create Event when set to `TEST`.

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
- `EXPO_PUBLIC_BYPASS_PHONE_VALIDATION` (mobile) - Public runtime flag; set to `TEST` (via `app.config.ts` mapping from `.env`) to enable Create Event without phone verification and hide the nudge on Event List.

Notes:
- For mobile (Expo), only variables exposed through `expo.extra` are available at runtime. This repo uses `apps/mobile/app.config.ts` to map `.env` → `extra` (e.g., `BYPASS_PHONE_VALIDATION` → `EXPO_PUBLIC_BYPASS_PHONE_VALIDATION`).
- After changing `.env` or `app.config.ts`, restart Metro with cache clear: `npx expo start -c`.

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
