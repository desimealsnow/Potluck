const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Disable Expo Router
config.resolver.unstable_enablePackageExports = false;

// Ensure proper resolution of root files
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

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
  '@/forms': path.resolve(__dirname, 'src/shared/components/forms'),
  '@/layout': path.resolve(__dirname, 'src/shared/components/layout'),
  
  // Shared utilities and services
  '@/hooks': path.resolve(__dirname, 'src/shared/hooks'),
  '@/utils': path.resolve(__dirname, 'src/shared/utils'),
  '@/services': path.resolve(__dirname, 'src/shared/services'),
  '@/types': path.resolve(__dirname, 'src/shared/types'),
  
  // Core-level aliases
  '@/config': path.resolve(__dirname, 'src/core/config'),
  '@/navigation': path.resolve(__dirname, 'src/core/navigation'),
  
  // Legacy aliases for backward compatibility
  '@/theme': path.resolve(__dirname, 'src/theme'),
  '@/pages': path.resolve(__dirname, 'src/pages'),
  '@/polyfills': path.resolve(__dirname, 'src/polyfills'),
  '@common': path.resolve(__dirname, '../../libs/common/src'),
};


module.exports = config;
