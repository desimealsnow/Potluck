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
                
                // Legacy aliases for backward compatibility
                '@/theme': './src/theme',
                '@/pages': './src/pages',
                '@/polyfills': './src/polyfills',
                '@common': '../../libs/common/src',
              },
        },
      ],
    ],
  };
};
