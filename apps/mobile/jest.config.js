module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts',
    '@testing-library/jest-native/extend-expect'
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@sentry/react-native|native-base|react-native-svg)'
  ],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(js|jsx|ts|tsx)',
    '**/*.(test|spec).(js|jsx|ts|tsx)'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@common/(.*)$': '<rootDir>/../../libs/common/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/config/**',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      branches: 75,
      functions: 80,
      statements: 80,
    },
    // Specific thresholds for join request modules
    'src/hooks/useJoinRequests.ts': {
      lines: 90,
      branches: 85,
      functions: 90,
      statements: 90,
    },
    'src/components/joinRequests/**/*.tsx': {
      lines: 85,
      branches: 80,
      functions: 85,
      statements: 85,
    },
    'src/services/apiClient.ts': {
      lines: 85,
      branches: 80,
      functions: 85,
      statements: 85,
    },
  },
  testEnvironment: 'node',
  globals: {
    '__DEV__': true,
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testTimeout: 10000, // 10 seconds for async operations
  verbose: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
