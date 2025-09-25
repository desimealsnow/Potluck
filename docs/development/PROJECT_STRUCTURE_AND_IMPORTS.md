# Project Structure & Absolute Imports Guide

> **Purpose**: Comprehensive guide to the Potluck project structure and absolute imports system
> **Last Updated**: 2025-01-20
> **Version**: 1.0

## 🎯 Overview

The Potluck mobile app has been restructured to use a feature-based architecture with absolute imports, enabling a "drag-and-drop" development workflow where files can be moved between directories by updating only configuration files.

## 📁 Project Structure

### Directory Organization

```
apps/mobile/
├── src/
│   ├── core/                    # Core application logic
│   │   ├── config/             # Configuration files
│   │   │   └── supabaseClient.ts
│   │   └── navigation/          # Navigation setup
│   ├── features/               # Feature-based modules
│   │   ├── auth/               # Authentication
│   │   │   ├── screens/        # Auth screens
│   │   │   ├── components/     # Auth-specific components
│   │   │   └── hooks/          # Auth-specific hooks
│   │   ├── events/             # Event management
│   │   │   ├── screens/        # Event screens
│   │   │   ├── components/     # Event components
│   │   │   └── lib/            # Event utilities
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
├── tsconfig.json               # TypeScript configuration
├── metro.config.js            # Metro bundler configuration
├── babel.config.js            # Babel transpilation configuration
└── package.json               # Dependencies and scripts
```

### Key Principles

1. **Feature-Based Organization**: Each feature is self-contained with its own screens, components, and logic
2. **Shared Resources**: Common components, hooks, and utilities are in the `shared/` directory
3. **Core Logic**: Application-wide configuration and navigation in the `core/` directory
4. **No Barrel Exports**: Direct file imports without index.ts barrel files

## 🔧 Absolute Imports Configuration

### TypeScript Configuration (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/shared/*": ["src/shared/*"],
      "@/features/*": ["src/features/*"],
      "@/core/*": ["src/core/*"],
      "@/assets/*": ["src/assets/*"],
      
      // Feature-specific aliases
      "@/auth/*": ["src/features/auth/*"],
      "@/events/*": ["src/features/events/*"],
      "@/payments/*": ["src/features/payments/*"],
      "@/profile/*": ["src/features/profile/*"],
      "@/notifications/*": ["src/features/notifications/*"],
      "@/debug/*": ["src/features/debug/*"],
      
      // Shared component aliases
      "@/ui": ["src/shared/components/ui"],
      "@/ui/*": ["src/shared/components/ui/*"],
      "@ui": ["src/shared/components/ui"],
      "@/forms": ["src/shared/components/forms"],
      "@/forms/*": ["src/shared/components/forms/*"],
      "@/layout": ["src/shared/components/layout"],
      "@/layout/*": ["src/shared/components/layout/*"],
      
      // Shared utilities and services
      "@/hooks/*": ["src/shared/hooks/*"],
      "@/utils/*": ["src/shared/utils/*"],
      "@/services/*": ["src/shared/services/*"],
      "@/types/*": ["src/shared/types/*"],
      
      // Core-level aliases
      "@/config": ["src/core/config"],
      "@/config/*": ["src/core/config/*"],
      "@config": ["src/core/config"],
      "@/navigation": ["src/core/navigation"],
      "@/navigation/*": ["src/core/navigation/*"]
    }
  }
}
```

### Metro Configuration (`metro.config.js`)

```javascript
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable Expo Router
config.resolver.unstable_enablePackageExports = false;

// Add support for absolute imports
config.resolver.alias = {
  '@/shared': path.resolve(__dirname, 'src/shared'),
  '@/features': path.resolve(__dirname, 'src/features'),
  '@/core': path.resolve(__dirname, 'src/core'),
  '@/assets': path.resolve(__dirname, 'src/assets'),
  
  // Feature-specific aliases
  '@/auth': path.resolve(__dirname, 'src/features/auth'),
  '@/events': path.resolve(__dirname, 'src/features/events'),
  '@/payments': path.resolve(__dirname, 'src/features/payments'),
  '@/profile': path.resolve(__dirname, 'src/features/profile'),
  '@/notifications': path.resolve(__dirname, 'src/features/notifications'),
  '@/debug': path.resolve(__dirname, 'src/features/debug'),
  
  // Shared component aliases
  '@/ui': path.resolve(__dirname, 'src/shared/components/ui'),
  '@ui': path.resolve(__dirname, 'src/shared/components/ui'),
  '@/forms': path.resolve(__dirname, 'src/shared/components/forms'),
  '@/layout': path.resolve(__dirname, 'src/shared/components/layout'),
  
  // Shared utilities and services
  '@/hooks': path.resolve(__dirname, 'src/shared/hooks'),
  '@/utils': path.resolve(__dirname, 'src/shared/utils'),
  '@/services': path.resolve(__dirname, 'src/shared/services'),
  '@/types': path.resolve(__dirname, 'src/shared/types'),
  
  // Core-level aliases
  '@/config': path.resolve(__dirname, 'src/core/config'),
  '@config': path.resolve(__dirname, 'src/core/config'),
  '@/navigation': path.resolve(__dirname, 'src/core/navigation')
};

module.exports = config;
```

### Babel Configuration (`babel.config.js`)

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@/shared': './src/shared',
            '@/features': './src/features',
            '@/core': './src/core',
            '@/assets': './src/assets',
            
            // Feature-specific aliases
            '@/auth': './src/features/auth',
            '@/events': './src/features/events',
            '@/payments': './src/features/payments',
            '@/profile': './src/features/profile',
            '@/notifications': './src/features/notifications',
            '@/debug': './src/features/debug',
            
            // Shared component aliases
            '@/ui': './src/shared/components/ui',
            '@/ui/*': './src/shared/components/ui/*',
            '@ui': './src/shared/components/ui',
            '@/forms': './src/shared/components/forms',
            '@/forms/*': './src/shared/components/forms/*',
            '@/layout': './src/shared/components/layout',
            '@/layout/*': './src/shared/components/layout/*',
            
            // Shared utilities and services
            '@/hooks': './src/shared/hooks',
            '@/hooks/*': './src/shared/hooks/*',
            '@/utils': './src/shared/utils',
            '@/utils/*': './src/shared/utils/*',
            '@/services': './src/shared/services',
            '@/services/*': './src/shared/services/*',
            '@/types': './src/shared/types',
            '@/types/*': './src/shared/types/*',
            
            // Core-level aliases
            '@/config': './src/core/config',
            '@/config/*': './src/core/config/*',
            '@config': './src/core/config',
            '@/navigation': './src/core/navigation',
            '@/navigation/*': './src/core/navigation/*'
          },
        },
      ],
    ],
  };
};
```

## 📝 Import Patterns

### Feature Imports

```typescript
// Import from specific feature
import EventList from '@/events/screens/EventList';
import CreateEvent from '@/events/screens/CreateEvent';
import { useEventActions } from '@/events/hooks/useEventActions';

// Import from auth feature
import SupabaseAuthUI from '@/auth/screens/SupabaseAuthUI';
import { useAuth } from '@/auth/hooks/useAuth';
```

### Shared Component Imports

```typescript
// Import UI components
import { Button, Input, Card } from '@/ui';
import { Stepper, FoodOption } from '@/forms';
import { Header, Footer } from '@/layout';

// Import specific components
import { Button } from '@/ui/Button';
import { Stepper } from '@/forms/Stepper';
```

### Utility and Service Imports

```typescript
// Import utilities
import { formatDate, validateEmail } from '@/utils/helpers';
import { apiClient } from '@/services/apiClient';
import { useSubscriptionCheck } from '@/hooks/useSubscriptionCheck';

// Import types
import type { Event, User, JoinRequest } from '@/types';
```

### Configuration Imports

```typescript
// Import configuration
import { supabase } from '@/config/supabaseClient';
import { navigationRef } from '@/navigation/navigationRef';
```

## 🚀 Drag-and-Drop Workflow

### Moving Files Between Directories

1. **Move the file** to the new location
2. **Update configuration files** to add the new alias:
   - `tsconfig.json` - Add path mapping
   - `metro.config.js` - Add alias
   - `babel.config.js` - Add alias
3. **Update imports** in files that reference the moved file
4. **Test the changes** by running the app

### Example: Moving a Component

**Before:**
```
src/shared/components/ui/Button.tsx
```

**After:**
```
src/features/auth/components/Button.tsx
```

**Configuration Updates:**
```json
// tsconfig.json
{
  "paths": {
    "@/auth/components/*": ["src/features/auth/components/*"]
  }
}
```

```javascript
// metro.config.js
config.resolver.alias = {
  '@/auth/components': path.resolve(__dirname, 'src/features/auth/components')
};
```

```javascript
// babel.config.js
alias: {
  '@/auth/components': './src/features/auth/components'
}
```

**Import Update:**
```typescript
// Before
import { Button } from '@/ui/Button';

// After
import { Button } from '@/auth/components/Button';
```

## 🔍 Troubleshooting

### Common Issues

1. **Module not found errors**
   - Check that the alias is defined in all three config files
   - Ensure the file path is correct
   - Clear Metro cache: `npx expo start --clear`

2. **TypeScript errors**
   - Verify the path mapping in `tsconfig.json`
   - Check that the file exists at the specified path
   - Restart TypeScript server in your IDE

3. **Babel transformation issues**
   - Ensure the alias is defined in `babel.config.js`
   - Check that the `module-resolver` plugin is installed
   - Verify the alias pattern matches the import

### Debugging Steps

1. **Check Metro resolution:**
   ```bash
   npx expo start --clear
   ```

2. **Verify TypeScript compilation:**
   ```bash
   npx tsc --noEmit
   ```

3. **Test Babel transformation:**
   ```bash
   npx babel src/your-file.tsx --out-file test.js
   ```

## 📋 Best Practices

### Import Organization

```typescript
// 1. React and React Native imports
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';

// 2. Third-party library imports
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// 3. Internal imports (grouped by type)
// - Core/configuration
import { supabase } from '@/config/supabaseClient';

// - Shared components
import { Button, Input } from '@/ui';
import { useSubscriptionCheck } from '@/hooks/useSubscriptionCheck';

// - Feature-specific imports
import EventList from '@/events/screens/EventList';
import { useEventActions } from '@/events/hooks/useEventActions';

// - Types
import type { Event, User } from '@/types';
```

### File Naming Conventions

- **Components**: PascalCase (e.g., `EventList.tsx`)
- **Hooks**: camelCase starting with 'use' (e.g., `useEventActions.ts`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Types**: PascalCase (e.g., `Event.ts`)
- **Screens**: PascalCase (e.g., `CreateEvent.tsx`)

### Directory Structure Guidelines

- **One component per file** (except for related small components)
- **Group related files** in the same directory
- **Use descriptive names** for directories and files
- **Keep feature directories** self-contained when possible

## 🎯 Benefits

### Development Experience

1. **Drag-and-Drop Workflow**: Move files without updating individual imports
2. **Clear Organization**: Feature-based structure makes code easier to navigate
3. **TypeScript Support**: Full IntelliSense and type checking for all aliases
4. **No Barrel Exports**: Direct imports without index.ts files
5. **Consistent Patterns**: Standardized import patterns across the codebase

### Maintenance

1. **Easier Refactoring**: Move files by updating only configuration
2. **Better Code Organization**: Clear separation of concerns
3. **Reduced Import Complexity**: No relative path navigation
4. **Scalable Structure**: Easy to add new features and components

## 🔗 Related Documentation

- [Main README](../../README.md) - Project overview
- [Development Guide](README.md) - General development practices
- [TypeScript Configuration](typescript.md) - TypeScript setup
- [Testing Guide](TESTING_README.md) - Testing strategies

---

*This guide provides comprehensive information about the project structure and absolute imports system. For questions or issues, refer to the troubleshooting section or open an issue.*
