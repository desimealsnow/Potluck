import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest for TypeScript support
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Root directory for tests and source code
  rootDir: '.',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.spec.ts',
    '<rootDir>/tests/**/*.test.ts'
  ],

  // Setup files run before each test file
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.ts'
  ],

  // Module path mapping for cleaner imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@common/(.*)$': '<rootDir>/../../libs/common/src/$1'
  },

  // Coverage configuration
  collectCoverage: false, // Enable only when running coverage command
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts', // Entry point, minimal logic
    '!src/app.ts',   // Express setup, tested via integration
    '!src/logger.ts', // Third-party wrapper
    '!src/config/**', // Environment config
    '!src/**/*.spec.ts',
    '!src/**/*.test.ts'
  ],
  
  // Coverage thresholds - fail if below these values
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 85,
      lines: 90,
      functions: 90
    },
    // Per-module thresholds for critical components
    './src/services/': {
      statements: 95,
      branches: 90,
      functions: 95
    },
    './src/utils/helper.ts': {
      statements: 100,
      branches: 95,
      functions: 100
    }
  },

  // Coverage reporters
  coverageReporters: [
    'text',           // Console output
    'text-summary',   // Brief summary
    'lcov',          // For SonarQube/external tools
    'html',          // HTML report in coverage/ folder
    'cobertura'      // XML format for CI tools
  ],

  // Coverage output directory
  coverageDirectory: '<rootDir>/coverage',

  // Test timeout (in milliseconds)
  testTimeout: 30000, // 30 seconds for database operations

  // Reporters for test results
  reporters: ['default'],

  // Global test configuration
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json'
    }
  },

  // Module file extensions Jest should consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files with ts-jest
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest'
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // Clear mocks between every test
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Verbose output for debugging
  verbose: false, // Set to true for detailed test output

  // Detect open handles to prevent hanging processes
  detectOpenHandles: true,
  
  // Force exit after tests complete (prevents hanging on DB connections)
  forceExit: true,

  // Maximum number of worker processes
  maxWorkers: '50%', // Use half of available CPU cores

  // Randomize test order to catch dependencies
  randomize: true,

  // Test environment options
  testEnvironmentOptions: {
    // Additional Node.js environment setup if needed
  }
};

export default config;
