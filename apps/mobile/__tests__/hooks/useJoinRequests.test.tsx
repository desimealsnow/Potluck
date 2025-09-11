import { renderHook, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { 
  useEventAvailability, 
  useCreateJoinRequest, 
  useHostJoinRequests,
  useGuestJoinRequest 
} from '../../src/hooks/useJoinRequests';
import { apiClient } from '../../src/services/apiClient';

// Mock API client
jest.mock('../../src/services/apiClient', () => ({
  apiClient: {
    getEventAvailability: jest.fn(),
    createJoinRequest: jest.fn(),
    listJoinRequests: jest.fn(),
    approveJoinRequest: jest.fn(),
    declineJoinRequest: jest.fn(),
    waitlistJoinRequest: jest.fn(),
    cancelJoinRequest: jest.fn(),
    extendJoinRequestHold: jest.fn(),
  }
}));

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;
const mockedAlert = Alert as jest.Mocked<typeof Alert>;

describe('useJoinRequests hooks', () => {
  const mockEventId = 'event-123';
  const mockUserId = 'user-456';
  const mockRequestId = 'request-789';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useEventAvailability', () => {
    const mockAvailability = {
      total: 20,
      confirmed: 5,
      held: 3,
      available: 12
    };

    it('should fetch availability data successfully', async () => {
      mockedApiClient.getEventAvailability.mockResolvedValue(mockAvailability);

      const { result } = renderHook(() => useEventAvailability(mockEventId));

      // Initially loading
      expect(result.current.loading).toBe(true);
      expect(result.current.availability).toBeNull();
      expect(result.current.error).toBeNull();

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.availability).toEqual(mockAvailability);
      expect(result.current.error).toBeNull();
      expect(mockedApiClient.getEventAvailability).toHaveBeenCalledWith(mockEventId);
    });

    it('should handle API errors', async () => {
      const mockError = new Error('Failed to fetch availability');
      mockedApiClient.getEventAvailability.mockRejectedValue(mockError);

      const { result } = renderHook(() => useEventAvailability(mockEventId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.availability).toBeNull();
      expect(result.current.error).toBe('Failed to fetch availability');
    });

    it('should not fetch when eventId is empty', () => {
      renderHook(() => useEventAvailability(''));

      expect(mockedApiClient.getEventAvailability).not.toHaveBeenCalled();
    });

    it('should refresh availability data', async () => {
      mockedApiClient.getEventAvailability.mockResolvedValue(mockAvailability);

      const { result } = renderHook(() => useEventAvailability(mockEventId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Clear the mock and refresh
      jest.clearAllMocks();

      await act(async () => {
        result.current.refresh();
      });

      await waitFor(() => {
        expect(mockedApiClient.getEventAvailability).toHaveBeenCalledWith(mockEventId);
      });
    });
  });

  describe('useCreateJoinRequest', () => {
    const mockRequestData = {
      party_size: 2,
      note: 'Looking forward to this event!'
    };

    const mockCreatedRequest = {
      id: mockRequestId,
      event_id: mockEventId,
      user_id: mockUserId,
      party_size: 2,
      note: 'Looking forward to this event!',
      status: 'pending' as const,
      hold_expires_at: '2024-01-01T12:30:00Z',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    };

    it('should create request successfully', async () => {
      mockedApiClient.createJoinRequest.mockResolvedValue(mockCreatedRequest);

      const { result } = renderHook(() => useCreateJoinRequest(mockEventId));

      expect(result.current.creating).toBe(false);

      let createdRequest: any;
      await act(async () => {
        createdRequest = await result.current.createRequest(mockRequestData);
      });

      expect(createdRequest).toEqual(mockCreatedRequest);
      expect(mockedApiClient.createJoinRequest).toHaveBeenCalledWith(mockEventId, mockRequestData);
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        '🎯 Request Submitted!',
        'Your request for 2 people has been submitted. The host will review it shortly.',
        [{ text: 'OK' }]
      );
      expect(result.current.creating).toBe(false);
    });

    it('should handle singular party size in success message', async () => {
      const singlePartyData = { party_size: 1, note: 'Just me!' };
      mockedApiClient.createJoinRequest.mockResolvedValue({
        ...mockCreatedRequest,
        party_size: 1
      });

      const { result } = renderHook(() => useCreateJoinRequest(mockEventId));

      await act(async () => {
        await result.current.createRequest(singlePartyData);
      });

      expect(mockedAlert.alert).toHaveBeenCalledWith(
        '🎯 Request Submitted!',
        'Your request for 1 person has been submitted. The host will review it shortly.',
        [{ text: 'OK' }]
      );
    });

    it('should handle capacity errors', async () => {
      const capacityError = new Error('Not enough capacity for your party size.');
      capacityError.message = 'Insufficient capacity: need 3, have 2';
      mockedApiClient.createJoinRequest.mockRejectedValue(capacityError);

      const { result } = renderHook(() => useCreateJoinRequest(mockEventId));

      let createdRequest: any;
      await act(async () => {
        createdRequest = await result.current.createRequest(mockRequestData);
      });

      expect(createdRequest).toBeNull();
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        'Request Failed',
        "Sorry, there's not enough capacity for your party size.",
        [{ text: 'OK' }]
      );
    });

    it('should handle duplicate request errors', async () => {
      const duplicateError = new Error('Already requested');
      duplicateError.message = 'You already have a pending request for this event.';
      mockedApiClient.createJoinRequest.mockRejectedValue(duplicateError);

      const { result } = renderHook(() => useCreateJoinRequest(mockEventId));

      await act(async () => {
        await result.current.createRequest(mockRequestData);
      });

      expect(mockedAlert.alert).toHaveBeenCalledWith(
        'Request Failed',
        'You already have a pending request for this event.',
        [{ text: 'OK' }]
      );
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Network error');
      mockedApiClient.createJoinRequest.mockRejectedValue(genericError);

      const { result } = renderHook(() => useCreateJoinRequest(mockEventId));

      await act(async () => {
        await result.current.createRequest(mockRequestData);
      });

      expect(mockedAlert.alert).toHaveBeenCalledWith(
        'Request Failed',
        'Network error',
        [{ text: 'OK' }]
      );
    });

    it('should track creating state', async () => {
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise(resolve => {
        resolvePromise = resolve;
      });

      mockedApiClient.createJoinRequest.mockReturnValue(pendingPromise);

      const { result } = renderHook(() => useCreateJoinRequest(mockEventId));

      expect(result.current.creating).toBe(false);

      act(() => {
        result.current.createRequest(mockRequestData);
      });

      expect(result.current.creating).toBe(true);

      await act(async () => {
        resolvePromise!(mockCreatedRequest);
        await pendingPromise;
      });

      expect(result.current.creating).toBe(false);
    });
  });

  describe('useHostJoinRequests', () => {
    const mockRequests = [
      {
        id: 'req-1',
        event_id: mockEventId,
        user_id: 'user-1',
        party_size: 2,
        note: 'Looking forward to it!',
        status: 'pending' as const,
        hold_expires_at: '2024-01-01T12:30:00Z',
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z'
      },
      {
        id: 'req-2',
        event_id: mockEventId,
        user_id: 'user-2',
        party_size: 1,
        note: null,
        status: 'waitlisted' as const,
        hold_expires_at: null,
        created_at: '2024-01-01T11:00:00Z',
        updated_at: '2024-01-01T11:30:00Z'
      }
    ];

    const mockPaginatedResponse = {
      data: mockRequests,
      nextOffset: null,
      totalCount: 2
    };

    it('should fetch requests successfully', async () => {
      mockedApiClient.listJoinRequests.mockResolvedValue(mockPaginatedResponse);

      const { result } = renderHook(() => useHostJoinRequests(mockEventId));

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.requests).toEqual(mockRequests);
      expect(result.current.totalCount).toBe(2);
      expect(result.current.hasMore).toBe(false);
      expect(mockedApiClient.listJoinRequests).toHaveBeenCalledWith(mockEventId, {
        limit: 20,
        offset: 0,
        status: undefined
      });
    });

    it('should approve request successfully', async () => {
      mockedApiClient.listJoinRequests.mockResolvedValue(mockPaginatedResponse);
      mockedApiClient.approveJoinRequest.mockResolvedValue({
        ...mockRequests[0],
        status: 'approved'
      });

      const { result } = renderHook(() => useHostJoinRequests(mockEventId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let approveResult: boolean;
      await act(async () => {
        approveResult = await result.current.approveRequest('req-1');
      });

      expect(approveResult!).toBe(true);
      expect(mockedApiClient.approveJoinRequest).toHaveBeenCalledWith(mockEventId, 'req-1');
      expect(result.current.requests[0].status).toBe('approved');
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        '✅ Request Approved',
        'The guest has been added to your event!'
      );
    });

    it('should handle approval capacity errors', async () => {
      mockedApiClient.listJoinRequests.mockResolvedValue(mockPaginatedResponse);
      
      const capacityError = new Error('Insufficient capacity');
      capacityError.message = 'Not enough capacity remaining for this party size.';
      mockedApiClient.approveJoinRequest.mockRejectedValue(capacityError);

      const { result } = renderHook(() => useHostJoinRequests(mockEventId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let approveResult: boolean;
      await act(async () => {
        approveResult = await result.current.approveRequest('req-1');
      });

      expect(approveResult!).toBe(false);
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        'Approval Failed',
        'Not enough capacity remaining for this party size.'
      );
    });

    it('should decline request successfully', async () => {
      mockedApiClient.listJoinRequests.mockResolvedValue(mockPaginatedResponse);
      mockedApiClient.declineJoinRequest.mockResolvedValue({
        ...mockRequests[0],
        status: 'declined'
      });

      const { result } = renderHook(() => useHostJoinRequests(mockEventId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let declineResult: boolean;
      await act(async () => {
        declineResult = await result.current.declineRequest('req-1');
      });

      expect(declineResult!).toBe(true);
      expect(result.current.requests[0].status).toBe('declined');
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        '❌ Request Declined',
        'The guest has been notified.'
      );
    });

    it('should waitlist request successfully', async () => {
      mockedApiClient.listJoinRequests.mockResolvedValue(mockPaginatedResponse);
      mockedApiClient.waitlistJoinRequest.mockResolvedValue({
        ...mockRequests[0],
        status: 'waitlisted'
      });

      const { result } = renderHook(() => useHostJoinRequests(mockEventId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let waitlistResult: boolean;
      await act(async () => {
        waitlistResult = await result.current.waitlistRequest('req-1');
      });

      expect(waitlistResult!).toBe(true);
      expect(result.current.requests[0].status).toBe('waitlisted');
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        '⏳ Request Waitlisted',
        'The guest has been added to the waitlist.'
      );
    });

    it('should extend hold successfully', async () => {
      mockedApiClient.listJoinRequests.mockResolvedValue(mockPaginatedResponse);
      
      const extendedExpiry = new Date();
      extendedExpiry.setMinutes(extendedExpiry.getMinutes() + 30);
      
      mockedApiClient.extendJoinRequestHold.mockResolvedValue({
        ...mockRequests[0],
        hold_expires_at: extendedExpiry.toISOString()
      });

      const { result } = renderHook(() => useHostJoinRequests(mockEventId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      let extendResult: boolean;
      await act(async () => {
        extendResult = await result.current.extendHold('req-1');
      });

      expect(extendResult!).toBe(true);
      expect(mockedApiClient.extendJoinRequestHold).toHaveBeenCalledWith(mockEventId, 'req-1', 30);
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        '⏰ Hold Extended',
        'Hold extended by 30 minutes.'
      );
    });

    it('should track processing state', async () => {
      mockedApiClient.listJoinRequests.mockResolvedValue(mockPaginatedResponse);
      
      let resolveApproval: (value: any) => void;
      const pendingApproval = new Promise(resolve => {
        resolveApproval = resolve;
      });

      mockedApiClient.approveJoinRequest.mockReturnValue(pendingApproval);

      const { result } = renderHook(() => useHostJoinRequests(mockEventId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.processing).toBeNull();

      act(() => {
        result.current.approveRequest('req-1');
      });

      expect(result.current.processing).toBe('req-1');

      await act(async () => {
        resolveApproval!({ ...mockRequests[0], status: 'approved' });
        await pendingApproval;
      });

      expect(result.current.processing).toBeNull();
    });

    it('should handle pagination correctly', async () => {
      const firstPageResponse = {
        data: [mockRequests[0]],
        nextOffset: 1,
        totalCount: 2
      };

      mockedApiClient.listJoinRequests.mockResolvedValue(firstPageResponse);

      const { result } = renderHook(() => useHostJoinRequests(mockEventId));

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasMore).toBe(true);
      expect(result.current.totalCount).toBe(2);
    });
  });

  describe('useGuestJoinRequest', () => {
    it('should cancel request successfully', async () => {
      const mockCancelledRequest = {
        id: mockRequestId,
        status: 'cancelled' as const,
      };

      mockedApiClient.cancelJoinRequest.mockResolvedValue(mockCancelledRequest);

      const { result } = renderHook(() => useGuestJoinRequest(mockEventId, mockUserId));

      let cancelResult: boolean;
      await act(async () => {
        cancelResult = await result.current.cancelRequest(mockRequestId);
      });

      expect(cancelResult!).toBe(true);
      expect(mockedApiClient.cancelJoinRequest).toHaveBeenCalledWith(mockEventId, mockRequestId);
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        '✅ Request Cancelled',
        'Your join request has been cancelled.'
      );
    });

    it('should handle expired hold when cancelling', async () => {
      const expiredError = new Error('Hold expired');
      expiredError.message = 'Cannot cancel - your hold has already expired.';
      mockedApiClient.cancelJoinRequest.mockRejectedValue(expiredError);

      const { result } = renderHook(() => useGuestJoinRequest(mockEventId, mockUserId));

      let cancelResult: boolean;
      await act(async () => {
        cancelResult = await result.current.cancelRequest(mockRequestId);
      });

      expect(cancelResult!).toBe(false);
      expect(mockedAlert.alert).toHaveBeenCalledWith(
        'Cancellation Failed',
        'Cannot cancel - your hold has already expired.'
      );
    });

    it('should track cancelling state', async () => {
      let resolveCancellation: (value: any) => void;
      const pendingCancellation = new Promise(resolve => {
        resolveCancellation = resolve;
      });

      mockedApiClient.cancelJoinRequest.mockReturnValue(pendingCancellation);

      const { result } = renderHook(() => useGuestJoinRequest(mockEventId, mockUserId));

      expect(result.current.cancelling).toBe(false);

      act(() => {
        result.current.cancelRequest(mockRequestId);
      });

      expect(result.current.cancelling).toBe(true);

      await act(async () => {
        resolveCancellation!({ id: mockRequestId, status: 'cancelled' });
        await pendingCancellation;
      });

      expect(result.current.cancelling).toBe(false);
    });
  });
});
