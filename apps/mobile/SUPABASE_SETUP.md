# Supabase Setup for Mobile App

## Configuration

1. **Update Supabase Client Configuration**
   
   Edit `apps/mobile/src/config/supabaseClient.ts` and replace the placeholder values:
   
   ```typescript
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key';
   ```

2. **Get Your Supabase Credentials**
   
   - Go to your Supabase project dashboard
   - Navigate to Settings > API
   - Copy the Project URL and anon/public key
   - Replace the values in the config file

## Features Implemented

### Authentication
- **Login**: Email/password authentication using Supabase Auth
- **Signup**: User registration with email verification
- **Session Management**: Automatic session persistence and restoration
- **Logout**: Sign out functionality

### User Data
- **Display Name**: Stored in user metadata during signup
- **Email Verification**: Automatic email verification flow
- **Session State**: Real-time auth state changes

## Usage

The authentication is now fully integrated with Supabase:

1. **LoginScreen**: Handles user login with Supabase Auth
2. **SignupScreen**: Handles user registration with Supabase Auth
3. **Session Persistence**: Users stay logged in across app restarts
4. **Auto-navigation**: Automatically navigates to EventList when authenticated

## Environment Variables (Recommended)

For production, move the Supabase credentials to environment variables:

1. Install `expo-constants`:
   ```bash
   npx expo install expo-constants
   ```

2. Create `app.config.js`:
   ```javascript
   export default {
     expo: {
       extra: {
         supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
         supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
       },
     },
   };
   ```

3. Update the config to use environment variables:
   ```typescript
   import Constants from 'expo-constants';
   
   const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
   const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;
   ```
