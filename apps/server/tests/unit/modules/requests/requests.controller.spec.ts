import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest';
import { Request, Response } from 'express';
import * as RequestsController from '../../../../src/modules/requests/requests.controller';
import { RequestsService } from '../../../../src/modules/requests/requests.service';
import type { AuthenticatedRequest } from '../../../../src/middleware/authGuard';

// Mock the service layer
vi.mock('../../../../src/modules/requests/requests.service');
const mockRequestsService = vi.mocked(RequestsService);

// Mock the helper function
vi.mock('../../../../src/utils/helper', () => ({
  handle: vi.fn((res: Response, result: any) => {
    if (!result.ok) {
      const status = parseInt(result.code || '500');
      return res.status(status).json({ 
        ok: false, 
        error: result.error, 
        code: result.code 
      });
    }
    return res.status(200).json(result.data);
  })
}));

describe('RequestsController', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: any;

  const mockEventId = 'event-123';
  const mockRequestId = 'request-456';
  const mockUserId = 'user-789';

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockReq = {
      params: {},
      body: {},
      query: {},
      user: { id: mockUserId }
    };
    
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    };

    mockNext = vi.fn();
  });

  describe('getEventAvailability', () => {
    beforeEach(() => {
      mockReq.params = { eventId: mockEventId };
    });

    it('should return availability data successfully', async () => {
      const mockAvailability = {
        total: 20,
        confirmed: 5,
        held: 3,
        available: 12
      };

      mockRequestsService.getEventAvailability.mockResolvedValue({
        ok: true,
        data: mockAvailability
      });

      await RequestsController.getEventAvailability(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.getEventAvailability).toHaveBeenCalledWith(mockEventId);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockAvailability);
    });

    it('should handle invalid event ID', async () => {
      mockReq.params = { eventId: 'invalid-uuid' };

      await RequestsController.getEventAvailability(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid event ID',
        code: '400'
      });
    });

    it('should handle service errors', async () => {
      mockRequestsService.getEventAvailability.mockResolvedValue({
        ok: false,
        error: 'Event not found',
        code: '404'
      });

      await RequestsController.getEventAvailability(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Event not found',
        code: '404'
      });
    });
  });

  describe('createJoinRequest', () => {
    beforeEach(() => {
      mockReq.params = { eventId: mockEventId };
      mockReq.body = { party_size: 2, note: 'Looking forward to this!' };
    });

    it('should create join request successfully', async () => {
      const mockCreatedRequest = {
        id: mockRequestId,
        event_id: mockEventId,
        user_id: mockUserId,
        party_size: 2,
        note: 'Looking forward to this!',
        status: 'pending' as const,
        hold_expires_at: '2024-01-01T12:30:00Z',
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z'
      };

      mockRequestsService.createJoinRequest.mockResolvedValue({
        ok: true,
        data: mockCreatedRequest
      });

      await RequestsController.createJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.createJoinRequest).toHaveBeenCalledWith(
        mockEventId,
        mockUserId,
        { party_size: 2, note: 'Looking forward to this!' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockCreatedRequest);
    });

    it('should require authentication', async () => {
      mockReq.user = undefined;

      await RequestsController.createJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Unauthorized',
        code: '401'
      });
      expect(mockRequestsService.createJoinRequest).not.toHaveBeenCalled();
    });

    it('should validate request body', async () => {
      mockReq.body = { party_size: 0 }; // Invalid party size

      await RequestsController.createJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Invalid request data',
          code: '400'
        })
      );
      expect(mockRequestsService.createJoinRequest).not.toHaveBeenCalled();
    });

    it('should handle missing party_size', async () => {
      mockReq.body = { note: 'Test note' }; // Missing required field

      await RequestsController.createJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRequestsService.createJoinRequest).not.toHaveBeenCalled();
    });

    it('should handle capacity errors', async () => {
      mockRequestsService.createJoinRequest.mockResolvedValue({
        ok: false,
        error: 'Insufficient capacity: need 2, have 1',
        code: '409'
      });

      await RequestsController.createJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Insufficient capacity: need 2, have 1',
        code: '409'
      });
    });
  });

  describe('listJoinRequests', () => {
    beforeEach(() => {
      mockReq.params = { eventId: mockEventId };
      mockReq.query = { limit: '10', offset: '0', status: 'pending' };
    });

    it('should list join requests successfully', async () => {
      const mockRequests = {
        data: [
          {
            id: 'req-1',
            event_id: mockEventId,
            user_id: 'user-1', 
            party_size: 2,
            status: 'pending' as const,
            created_at: '2024-01-01T12:00:00Z',
            updated_at: '2024-01-01T12:00:00Z'
          }
        ],
        nextOffset: null as number | null,
        totalCount: 1
      };

      mockRequestsService.listJoinRequests.mockResolvedValue({
        ok: true,
        data: mockRequests
      });

      await RequestsController.listJoinRequests(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.listJoinRequests).toHaveBeenCalledWith(
        mockEventId,
        mockUserId,
        { limit: 10, offset: 0, status: 'pending' }
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockRequests);
    });

    it('should use default query parameters', async () => {
      mockReq.query = {}; // No query params

      mockRequestsService.listJoinRequests.mockResolvedValue({
        ok: true,
        data: { data: [], nextOffset: null, totalCount: 0 }
      });

      await RequestsController.listJoinRequests(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.listJoinRequests).toHaveBeenCalledWith(
        mockEventId,
        mockUserId,
        { limit: 25, offset: 0, status: undefined }
      );
    });

    it('should validate query parameters', async () => {
      mockReq.query = { limit: 'invalid', offset: '-1' };

      await RequestsController.listJoinRequests(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: false,
          error: 'Invalid query parameters',
          code: '400'
        })
      );
    });
  });

  describe('approveJoinRequest', () => {
    beforeEach(() => {
      mockReq.params = { eventId: mockEventId, requestId: mockRequestId };
    });

    it('should approve request successfully', async () => {
      const mockApprovedRequest = {
        id: mockRequestId,
        event_id: mockEventId,
        user_id: mockUserId,
        party_size: 2,
        status: 'approved' as const,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:05:00Z'
      };

      mockRequestsService.approveRequest.mockResolvedValue({
        ok: true,
        data: mockApprovedRequest
      });

      await RequestsController.approveJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.approveRequest).toHaveBeenCalledWith(
        mockRequestId,
        mockUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockApprovedRequest);
    });

    it('should validate path parameters', async () => {
      mockReq.params = { eventId: 'invalid', requestId: 'invalid' };

      await RequestsController.approveJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Invalid parameters',
        code: '400'
      });
    });

    it('should handle approval failures', async () => {
      mockRequestsService.approveRequest.mockResolvedValue({
        ok: false,
        error: 'Insufficient capacity',
        code: '409'
      });

      await RequestsController.approveJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });

  describe('declineJoinRequest', () => {
    beforeEach(() => {
      mockReq.params = { eventId: mockEventId, requestId: mockRequestId };
    });

    it('should decline request successfully', async () => {
      const mockDeclinedRequest = {
        id: mockRequestId,
        event_id: mockEventId,
        user_id: mockUserId,
        party_size: 2,
        status: 'declined' as const,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:05:00Z'
      };

      mockRequestsService.declineRequest.mockResolvedValue({
        ok: true,
        data: mockDeclinedRequest
      });

      await RequestsController.declineJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.declineRequest).toHaveBeenCalledWith(
        mockRequestId,
        mockUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockDeclinedRequest);
    });
  });

  describe('waitlistJoinRequest', () => {
    beforeEach(() => {
      mockReq.params = { eventId: mockEventId, requestId: mockRequestId };
    });

    it('should waitlist request successfully', async () => {
      const mockWaitlistedRequest = {
        id: mockRequestId,
        event_id: mockEventId,
        user_id: mockUserId,
        party_size: 2,
        status: 'waitlisted' as const,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:05:00Z'
      };

      mockRequestsService.waitlistRequest.mockResolvedValue({
        ok: true,
        data: mockWaitlistedRequest
      });

      await RequestsController.waitlistJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.waitlistRequest).toHaveBeenCalledWith(
        mockRequestId,
        mockUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockWaitlistedRequest);
    });
  });

  describe('cancelJoinRequest', () => {
    beforeEach(() => {
      mockReq.params = { eventId: mockEventId, requestId: mockRequestId };
    });

    it('should cancel request successfully', async () => {
      const mockCancelledRequest = {
        id: mockRequestId,
        event_id: mockEventId,
        user_id: mockUserId,
        party_size: 2,
        status: 'cancelled' as const,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:05:00Z'
      };

      mockRequestsService.cancelRequest.mockResolvedValue({
        ok: true,
        data: mockCancelledRequest
      });

      await RequestsController.cancelJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.cancelRequest).toHaveBeenCalledWith(
        mockRequestId,
        mockUserId
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCancelledRequest);
    });

    it('should handle expired requests', async () => {
      mockRequestsService.cancelRequest.mockResolvedValue({
        ok: false,
        error: 'Request hold has expired',
        code: '409'
      });

      await RequestsController.cancelJoinRequest(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });
  });

  describe('extendJoinRequestHold', () => {
    beforeEach(() => {
      mockReq.params = { eventId: mockEventId, requestId: mockRequestId };
      mockReq.body = { extension_minutes: 60 };
    });

    it('should extend hold successfully', async () => {
      const mockExtendedRequest = {
        id: mockRequestId,
        event_id: mockEventId,
        user_id: mockUserId,
        party_size: 2,
        status: 'pending' as const,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:05:00Z',
        hold_expires_at: '2024-01-01T13:00:00Z'
      };

      mockRequestsService.extendRequestHold.mockResolvedValue({
        ok: true,
        data: mockExtendedRequest
      });

      await RequestsController.extendJoinRequestHold(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.extendRequestHold).toHaveBeenCalledWith(
        mockRequestId,
        mockUserId,
        60
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockExtendedRequest);
    });

    it('should use default extension when not provided', async () => {
      mockReq.body = {}; // No extension_minutes

      mockRequestsService.extendRequestHold.mockResolvedValue({
        ok: true,
        data: {
          id: mockRequestId,
          event_id: mockEventId,
          user_id: mockUserId,
          party_size: 2,
          status: 'pending' as const,
          created_at: '2024-01-01T12:00:00Z',
          updated_at: '2024-01-01T12:05:00Z',
        }
      });

      await RequestsController.extendJoinRequestHold(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRequestsService.extendRequestHold).toHaveBeenCalledWith(
        mockRequestId,
        mockUserId,
        30 // Default value
      );
    });

    it('should validate extension duration', async () => {
      mockReq.body = { extension_minutes: 200 }; // Too long

      await RequestsController.extendJoinRequestHold(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        ok: false,
        error: 'Extension must be between 5 and 120 minutes',
        code: '400'
      });
      expect(mockRequestsService.extendRequestHold).not.toHaveBeenCalled();
    });

    it('should validate extension is a number', async () => {
      mockReq.body = { extension_minutes: 'invalid' };

      await RequestsController.extendJoinRequestHold(
        mockReq as AuthenticatedRequest,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRequestsService.extendRequestHold).not.toHaveBeenCalled();
    });
  });
});
