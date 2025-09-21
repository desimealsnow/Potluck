import type { 
  AvailabilityData, 
  JoinRequestData, 
  JoinRequestCreateData,
  JoinRequestStatus 
} from '../src/services/apiClient';

// ===============================================
// Test data factories and utilities
// ===============================================

export const TestDataFactory = {
  /**
   * Create mock availability data
   */
  createAvailability(overrides: Partial<AvailabilityData> = {}): AvailabilityData {
    return {
      total: 20,
      confirmed: 5,
      held: 3,
      available: 12,
      ...overrides,
    };
  },

  /**
   * Create mock join request data
   */
  createJoinRequest(overrides: Partial<JoinRequestData> = {}): JoinRequestData {
    const baseDate = new Date('2024-01-01T12:00:00Z');
    
    return {
      id: 'request-123',
      event_id: 'event-456',
      user_id: 'user-789',
      party_size: 2,
      note: 'Looking forward to this event!',
      status: 'pending',
      hold_expires_at: new Date(baseDate.getTime() + 30 * 60 * 1000).toISOString(),
      created_at: baseDate.toISOString(),
      updated_at: baseDate.toISOString(),
      ...overrides,
    };
  },

  /**
   * Create mock join request create data
   */
  createJoinRequestInput(overrides: Partial<JoinRequestCreateData> = {}): JoinRequestCreateData {
    return {
      party_size: 2,
      note: 'Test note',
      ...overrides,
    };
  },

  /**
   * Create multiple join requests with different statuses
   */
  createJoinRequestSet(eventId: string, count = 5): JoinRequestData[] {
    const statuses: JoinRequestStatus[] = ['pending', 'approved', 'declined', 'waitlisted', 'expired'];
    
    return Array.from({ length: count }, (_, index) => 
      this.createJoinRequest({
        id: `request-${index + 1}`,
        event_id: eventId,
        user_id: `user-${index + 1}`,
        status: statuses[index % statuses.length],
        party_size: (index % 3) + 1, // Vary party sizes 1-3
        note: index % 2 === 0 ? `Note for request ${index + 1}` : undefined,
      })
    );
  },

  /**
   * Create availability scenarios for testing
   */
  availabilityScenarios: {
    empty: (): AvailabilityData => ({
      total: 20,
      confirmed: 0,
      held: 0,
      available: 20,
    }),
    
    halfFull: (): AvailabilityData => ({
      total: 20,
      confirmed: 6,
      held: 4,
      available: 10,
    }),
    
    almostFull: (): AvailabilityData => ({
      total: 20,
      confirmed: 15,
      held: 2,
      available: 3,
    }),
    
    full: (): AvailabilityData => ({
      total: 20,
      confirmed: 12,
      held: 8,
      available: 0,
    }),
    
    overCapacity: (): AvailabilityData => ({
      total: 20,
      confirmed: 15,
      held: 10,
      available: -5, // Over capacity due to holds
    }),
  },

  /**
   * Create requests with specific expiry times for hold testing
   */
  createRequestsWithHolds: {
    active: (eventId: string): JoinRequestData => 
      TestDataFactory.createJoinRequest({
        event_id: eventId,
        hold_expires_at: new Date(Date.now() + 25 * 60 * 1000).toISOString(), // 25 min future
      }),
    
    expiringSoon: (eventId: string): JoinRequestData =>
      TestDataFactory.createJoinRequest({
        event_id: eventId,
        hold_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 min future
      }),
    
    expired: (eventId: string): JoinRequestData =>
      TestDataFactory.createJoinRequest({
        event_id: eventId,
        status: 'pending',
        hold_expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min past
      }),
    
    noExpiry: (eventId: string): JoinRequestData =>
      TestDataFactory.createJoinRequest({
        event_id: eventId,
        hold_expires_at: null,
      }),
  },
};

// ===============================================
// Test helpers and assertions
// ===============================================

export const TestHelpers = {
  /**
   * Wait for async operations to complete
   */
  waitForAsync: () => new Promise(resolve => setImmediate(resolve)),

  /**
   * Create mock API response
   */
  mockApiResponse: (data: any, status = 200) => ({
    ok: status < 400,
    status,
    json: async () => data,
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic' as const,
    url: '',
    clone: () => ({ json: async () => data } as any),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => JSON.stringify(data),
  } as Response),

  /**
   * Create mock API error response
   */
  mockApiError: (message: string, status = 500, code?: string) => ({
    ok: false,
    status,
    statusText: 'Error',
    json: async () => ({ message, code }),
    headers: new Headers(),
    redirected: false,
    type: 'basic' as const,
    url: '',
    clone: () => ({ json: async () => ({ message, code }) } as any),
    body: null,
    bodyUsed: false,
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    text: async () => JSON.stringify({ message, code }),
  } as Response),

  /**
   * Assert that a request was made with correct parameters
   */
  expectApiCall: (
    mockFetch: jest.MockedFunction<typeof fetch>,
    expectedUrl: string,
    expectedMethod: string,
    expectedBody?: any
  ) => {
    expect(mockFetch).toHaveBeenCalledWith(
      expectedUrl,
      expect.objectContaining({
        method: expectedMethod,
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        ...(expectedBody && { body: JSON.stringify(expectedBody) }),
      })
    );
  },

  /**
   * Create mock fetch implementation that can be customized per test
   */
  createMockFetch: (responses: Array<{ url: string; response: Response }>) => {
    return jest.fn((url: string) => {
      const match = responses.find(r => url.includes(r.url));
      if (match) {
        return Promise.resolve(match.response);
      }
      return Promise.reject(new Error(`Unexpected API call to ${url}`));
    });
  },
};

// ===============================================
// Custom assertions for join requests
// ===============================================

export const JoinRequestAssertions = {
  /**
   * Assert that availability data is valid
   */
  expectValidAvailability: (availability: AvailabilityData) => {
    expect(availability).toMatchObject({
      total: expect.any(Number),
      confirmed: expect.any(Number),
      held: expect.any(Number),
      available: expect.any(Number),
    });
    
    expect(availability.total).toBeGreaterThanOrEqual(0);
    expect(availability.confirmed).toBeGreaterThanOrEqual(0);
    expect(availability.held).toBeGreaterThanOrEqual(0);
    expect(availability.available).toBeGreaterThanOrEqual(0);
    
    // Availability should equal total - confirmed - held (allowing negative for over-capacity)
    expect(availability.available).toBe(availability.total - availability.confirmed - availability.held);
  },

  /**
   * Assert that join request data is valid
   */
  expectValidJoinRequest: (request: JoinRequestData) => {
    expect(request).toMatchObject({
      id: expect.any(String),
      event_id: expect.any(String),
      user_id: expect.any(String),
      party_size: expect.any(Number),
      status: expect.any(String),
      created_at: expect.any(String),
      updated_at: expect.any(String),
    });
    
    expect(request.party_size).toBeGreaterThan(0);
    expect(['pending', 'approved', 'declined', 'waitlisted', 'expired', 'cancelled'])
      .toContain(request.status);
    
    // Validate date formats
    expect(() => new Date(request.created_at)).not.toThrow();
    expect(() => new Date(request.updated_at)).not.toThrow();
    
    if (request.hold_expires_at && request.hold_expires_at !== null) {
      expect(() => new Date(request.hold_expires_at)).not.toThrow();
    }
  },

  /**
   * Assert that paginated response is valid
   */
  expectValidPaginatedResponse: (response: any, expectedMinItems = 0) => {
    expect(response).toMatchObject({
      data: expect.any(Array),
      totalCount: expect.any(Number),
    });
    
    expect(response.data.length).toBeGreaterThanOrEqual(expectedMinItems);
    expect(response.totalCount).toBeGreaterThanOrEqual(response.data.length);
    
    if (response.nextOffset !== null) {
      expect(response.nextOffset).toBeGreaterThan(0);
    }
  },
};

// ===============================================
// Mock implementations for common scenarios
// ===============================================

export const MockScenarios = {
  /**
   * Setup mocks for successful join request flow
   */
  successfulJoinFlow: () => ({
    availability: TestDataFactory.availabilityScenarios.halfFull(),
    createRequest: TestDataFactory.createJoinRequest(),
    listRequests: {
      data: TestDataFactory.createJoinRequestSet('event-123'),
      nextOffset: null,
      totalCount: 5,
    },
  }),

  /**
   * Setup mocks for capacity-limited scenarios
   */
  capacityLimitedFlow: () => ({
    availability: TestDataFactory.availabilityScenarios.almostFull(),
    createRequest: null, // Creation fails
    listRequests: {
      data: [],
      nextOffset: null,
      totalCount: 0,
    },
  }),

  /**
   * Setup mocks for error scenarios
   */
  errorFlow: () => ({
    availability: null,
    error: new Error('Network connection failed'),
  }),
};

// ===============================================
// Integration with global test utils
// ===============================================

// Extend global test utils with join request specific helpers
declare global {
  namespace NodeJS {
    interface Global {
      joinRequestTestUtils: typeof TestDataFactory & typeof TestHelpers & typeof JoinRequestAssertions;
    }
  }
}

if (typeof global !== 'undefined') {
  (global as any).joinRequestTestUtils = {
    ...TestDataFactory,
    ...TestHelpers,
    ...JoinRequestAssertions,
  };
}
