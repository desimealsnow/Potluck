import { apiClient, ApiError } from '../../src/services/apiClient';
import type { 
  AvailabilityData, 
  JoinRequestCreateData, 
  JoinRequestData,
  JoinRequestStatus 
} from '../../src/services/apiClient';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock Supabase auth
jest.mock('../../src/config/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => Promise.resolve({
        data: {
          session: {
            access_token: 'mock-token-12345',
          }
        }
      })),
    },
  },
}));

describe('ApiClient - Join Requests', () => {
  const mockEventId = 'event-123';
  const mockRequestId = 'request-456';
  
  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Suppress console logs in tests
    console.warn = jest.fn();
  });

  const mockSuccessResponse = (data: any, status = 200) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status,
      json: async () => data,
    } as Response);
  };

  const mockErrorResponse = (status: number, message: string, code?: string) => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status,
      statusText: 'Error',
      json: async () => ({ message, code }),
    } as Response);
  };

  describe('getEventAvailability', () => {
    const mockAvailability: AvailabilityData = {
      total: 20,
      confirmed: 5,
      held: 3,
      available: 12,
    };

    it('should fetch availability successfully', async () => {
      mockSuccessResponse(mockAvailability);

      const result = await apiClient.getEventAvailability(mockEventId);

      expect(result).toEqual(mockAvailability);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/availability`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-12345',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle 404 errors', async () => {
      mockErrorResponse(404, 'Event not found');

      await expect(apiClient.getEventAvailability(mockEventId)).rejects.toThrow(
        new ApiError('Event not found', 404)
      );
    });

    it('should handle server errors', async () => {
      mockErrorResponse(500, 'Internal server error');

      await expect(apiClient.getEventAvailability(mockEventId)).rejects.toThrow(
        new ApiError('Internal server error', 500)
      );
    });
  });

  describe('createJoinRequest', () => {
    const mockRequestData: JoinRequestCreateData = {
      party_size: 2,
      note: 'Looking forward to this event!',
    };

    const mockCreatedRequest: JoinRequestData = {
      id: mockRequestId,
      event_id: mockEventId,
      user_id: 'user-123',
      party_size: 2,
      note: 'Looking forward to this event!',
      status: 'pending',
      hold_expires_at: '2024-01-01T12:30:00Z',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
    };

    it('should create join request successfully', async () => {
      mockSuccessResponse(mockCreatedRequest, 201);

      const result = await apiClient.createJoinRequest(mockEventId, mockRequestData);

      expect(result).toEqual(mockCreatedRequest);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-12345',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(mockRequestData),
        })
      );
    });

    it('should handle capacity errors', async () => {
      mockErrorResponse(409, 'Insufficient capacity: need 2, have 1', 'capacity_unavailable');

      await expect(
        apiClient.createJoinRequest(mockEventId, mockRequestData)
      ).rejects.toThrow(
        new ApiError('Insufficient capacity: need 2, have 1', 409, 'capacity_unavailable')
      );
    });

    it('should handle duplicate request errors', async () => {
      mockErrorResponse(409, 'Already have a pending request for this event', 'already_requested');

      await expect(
        apiClient.createJoinRequest(mockEventId, mockRequestData)
      ).rejects.toThrow(
        new ApiError('Already have a pending request for this event', 409, 'already_requested')
      );
    });

    it('should handle validation errors', async () => {
      mockErrorResponse(400, 'Invalid request data');

      await expect(
        apiClient.createJoinRequest(mockEventId, { party_size: 0 })
      ).rejects.toThrow(
        new ApiError('Invalid request data', 400)
      );
    });
  });

  describe('listJoinRequests', () => {
    const mockRequests: JoinRequestData[] = [
      {
        id: 'req-1',
        event_id: mockEventId,
        user_id: 'user-1',
        party_size: 2,
        note: 'Excited to join!',
        status: 'pending',
        hold_expires_at: '2024-01-01T12:30:00Z',
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z',
      },
      {
        id: 'req-2',
        event_id: mockEventId,
        user_id: 'user-2',
        party_size: 1,
        note: null,
        status: 'waitlisted',
        hold_expires_at: null,
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:30:00Z',
      },
    ];

    const mockPaginatedResponse = {
      data: mockRequests,
      nextOffset: null,
      totalCount: 2,
    };

    it('should list requests successfully', async () => {
      mockSuccessResponse(mockPaginatedResponse);

      const result = await apiClient.listJoinRequests(mockEventId);

      expect(result).toEqual(mockPaginatedResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should include query parameters', async () => {
      mockSuccessResponse(mockPaginatedResponse);

      await apiClient.listJoinRequests(mockEventId, {
        limit: 10,
        offset: 20,
        status: 'pending',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests?limit=10&offset=20&status=pending`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle empty query parameters', async () => {
      mockSuccessResponse(mockPaginatedResponse);

      await apiClient.listJoinRequests(mockEventId, {});

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle partial query parameters', async () => {
      mockSuccessResponse(mockPaginatedResponse);

      await apiClient.listJoinRequests(mockEventId, {
        limit: 5,
        status: 'approved',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests?limit=5&status=approved`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should handle authorization errors', async () => {
      mockErrorResponse(403, 'Not authorized to view requests');

      await expect(apiClient.listJoinRequests(mockEventId)).rejects.toThrow(
        new ApiError('Not authorized to view requests', 403)
      );
    });
  });

  describe('approveJoinRequest', () => {
    const mockApprovedRequest: JoinRequestData = {
      id: mockRequestId,
      event_id: mockEventId,
      user_id: 'user-123',
      party_size: 2,
      status: 'approved',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:05:00Z',
    };

    it('should approve request successfully', async () => {
      mockSuccessResponse(mockApprovedRequest);

      const result = await apiClient.approveJoinRequest(mockEventId, mockRequestId);

      expect(result).toEqual(mockApprovedRequest);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests/${mockRequestId}/approve`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should handle capacity errors during approval', async () => {
      mockErrorResponse(409, 'Insufficient capacity', 'capacity_unavailable');

      await expect(
        apiClient.approveJoinRequest(mockEventId, mockRequestId)
      ).rejects.toThrow(
        new ApiError('Insufficient capacity', 409, 'capacity_unavailable')
      );
    });
  });

  describe('declineJoinRequest', () => {
    const mockDeclinedRequest: JoinRequestData = {
      id: mockRequestId,
      event_id: mockEventId,
      user_id: 'user-123',
      party_size: 2,
      status: 'declined',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:05:00Z',
    };

    it('should decline request successfully', async () => {
      mockSuccessResponse(mockDeclinedRequest);

      const result = await apiClient.declineJoinRequest(mockEventId, mockRequestId);

      expect(result).toEqual(mockDeclinedRequest);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests/${mockRequestId}/decline`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('waitlistJoinRequest', () => {
    const mockWaitlistedRequest: JoinRequestData = {
      id: mockRequestId,
      event_id: mockEventId,
      user_id: 'user-123',
      party_size: 2,
      status: 'waitlisted',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:05:00Z',
    };

    it('should waitlist request successfully', async () => {
      mockSuccessResponse(mockWaitlistedRequest);

      const result = await apiClient.waitlistJoinRequest(mockEventId, mockRequestId);

      expect(result).toEqual(mockWaitlistedRequest);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests/${mockRequestId}/waitlist`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });
  });

  describe('cancelJoinRequest', () => {
    const mockCancelledRequest: JoinRequestData = {
      id: mockRequestId,
      event_id: mockEventId,
      user_id: 'user-123',
      party_size: 2,
      status: 'cancelled',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:05:00Z',
    };

    it('should cancel request successfully', async () => {
      mockSuccessResponse(mockCancelledRequest);

      const result = await apiClient.cancelJoinRequest(mockEventId, mockRequestId);

      expect(result).toEqual(mockCancelledRequest);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests/${mockRequestId}/cancel`,
        expect.objectContaining({
          method: 'PATCH',
        })
      );
    });

    it('should handle expired hold errors', async () => {
      mockErrorResponse(409, 'Request hold has expired', 'hold_expired');

      await expect(
        apiClient.cancelJoinRequest(mockEventId, mockRequestId)
      ).rejects.toThrow(
        new ApiError('Request hold has expired', 409, 'hold_expired')
      );
    });
  });

  describe('extendJoinRequestHold', () => {
    const mockExtendedRequest: JoinRequestData = {
      id: mockRequestId,
      event_id: mockEventId,
      user_id: 'user-123',
      party_size: 2,
      status: 'pending',
      hold_expires_at: '2024-01-01T13:00:00Z', // Extended time
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:30:00Z',
    };

    it('should extend hold successfully', async () => {
      mockSuccessResponse(mockExtendedRequest);

      const result = await apiClient.extendJoinRequestHold(mockEventId, mockRequestId, 60);

      expect(result).toEqual(mockExtendedRequest);
      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests/${mockRequestId}/extend`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ extension_minutes: 60 }),
        })
      );
    });

    it('should use default extension when not provided', async () => {
      mockSuccessResponse(mockExtendedRequest);

      await apiClient.extendJoinRequestHold(mockEventId, mockRequestId);

      expect(mockFetch).toHaveBeenCalledWith(
        `http://localhost:3000/api/v1/events/${mockEventId}/requests/${mockRequestId}/extend`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ extension_minutes: 30 }), // Default
        })
      );
    });

    it('should handle invalid extension duration', async () => {
      mockErrorResponse(400, 'Extension must be between 5 and 120 minutes');

      await expect(
        apiClient.extendJoinRequestHold(mockEventId, mockRequestId, 200)
      ).rejects.toThrow(
        new ApiError('Extension must be between 5 and 120 minutes', 400)
      );
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(apiClient.getEventAvailability(mockEventId)).rejects.toThrow('Network error');
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => { throw new Error('Not JSON'); },
      } as Response);

      await expect(apiClient.getEventAvailability(mockEventId)).rejects.toThrow(
        new ApiError('Internal Server Error', 500)
      );
    });

    it('should handle 204 No Content responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
        json: async () => { throw new Error('No content'); },
      } as Response);

      const result = await apiClient.getEventAvailability(mockEventId);
      expect(result).toEqual({});
    });

    it('should include error codes in ApiError when provided', async () => {
      mockErrorResponse(409, 'Capacity unavailable', 'capacity_unavailable');

      try {
        await apiClient.createJoinRequest(mockEventId, { party_size: 1 });
        fail('Expected ApiError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(409);
        expect((error as ApiError).code).toBe('capacity_unavailable');
        expect(error.message).toBe('Capacity unavailable');
      }
    });
  });

  describe('Authentication', () => {
    it('should include authentication headers', async () => {
      mockSuccessResponse({ total: 10, confirmed: 5, held: 2, available: 3 });

      await apiClient.getEventAvailability(mockEventId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-12345',
          }),
        })
      );
    });

    it('should handle missing authentication token', async () => {
      // Mock no session
      const { supabase } = require('../../src/config/supabaseClient');
      supabase.auth.getSession.mockResolvedValueOnce({
        data: { session: null }
      });

      mockSuccessResponse({ total: 10, confirmed: 5, held: 2, available: 3 });

      await apiClient.getEventAvailability(mockEventId);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.not.objectContaining({
            'Authorization': expect.any(String),
          }),
        })
      );
    });
  });
});
