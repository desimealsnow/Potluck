// Jest setup for React Native tests
import 'react-native-gesture-handler/jestSetup';

// Mock React Native modules that don't work well in test environment
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock Expo modules
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock Expo vector icons removed

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        apiUrl: 'http://localhost:3000/api/v1',
      },
    },
  },
}));

// Mock React Native Paper components  
jest.mock('react-native-paper-dates', () => ({
  registerTranslation: jest.fn(),
}));

// Mock safe area context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: any }) => children,
  SafeAreaProvider: ({ children }: { children: any }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock async storage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

// Global test utilities
global.testUtils = {
  // Helper to create mock availability data
  createMockAvailability: (overrides = {}) => ({
    total: 20,
    confirmed: 5,
    held: 3,
    available: 12,
    ...overrides,
  }),

  // Helper to create mock join request data
  createMockJoinRequest: (overrides = {}) => ({
    id: 'request-123',
    event_id: 'event-456',
    user_id: 'user-789',
    party_size: 2,
    note: 'Test request note',
    status: 'pending' as const,
    hold_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  // Helper to create mock user data
  createMockUser: (overrides = {}) => ({
    id: 'user-123',
    email: 'test@example.com',
    displayName: 'Test User',
    ...overrides,
  }),

  // Helper to wait for async operations in tests
  waitForAsync: () => new Promise(resolve => setImmediate(resolve)),

  // Mock API responses
  mockApiResponse: (data: any, status = 200) => ({
    ok: status < 400,
    status,
    json: async () => data,
  }),

  mockApiError: (message: string, status = 500, code?: string) => ({
    ok: false,
    status,
    statusText: 'Error',
    json: async () => ({ message, code }),
  }),
};

// Suppress console logs during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

beforeEach(() => {
  if (process.env.TEST_VERBOSE !== 'true') {
    console.log = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  }
});

afterEach(() => {
  if (process.env.TEST_VERBOSE !== 'true') {
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
    console.error = originalConsoleError;
  }
});

// Type declarations for global utilities
declare global {
  var testUtils: {
    createMockAvailability: (overrides?: any) => any;
    createMockJoinRequest: (overrides?: any) => any;
    createMockUser: (overrides?: any) => any;
    waitForAsync: () => Promise<void>;
    mockApiResponse: (data: any, status?: number) => any;
    mockApiError: (message: string, status?: number, code?: string) => any;
  };
}
