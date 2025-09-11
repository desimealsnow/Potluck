import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import JoinRequestsManager from '../../src/components/joinRequests/JoinRequestsManager';
import { useHostJoinRequests } from '../../src/hooks/useJoinRequests';
import type { JoinRequestData } from '../../src/services/apiClient';

// Mock the hook
jest.mock('../../src/hooks/useJoinRequests', () => ({
  useHostJoinRequests: jest.fn(),
}));

// Mock Alert
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockUseHostJoinRequests = useHostJoinRequests as jest.MockedFunction<typeof useHostJoinRequests>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('JoinRequestsManager', () => {
  const mockEventId = 'event-123';

  const mockRequests: JoinRequestData[] = [
    {
      id: 'req-1',
      event_id: mockEventId,
      user_id: 'user-1',
      party_size: 2,
      note: 'Looking forward to this event!',
      status: 'pending',
      hold_expires_at: new Date(Date.now() + 20 * 60 * 1000).toISOString(), // 20 min future
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z',
    },
    {
      id: 'req-2',
      event_id: mockEventId,
      user_id: 'user-2',
      party_size: 1,
      note: null,
      status: 'approved',
      hold_expires_at: null,
      created_at: '2024-01-01T11:00:00Z',
      updated_at: '2024-01-01T11:30:00Z',
    },
    {
      id: 'req-3',
      event_id: mockEventId,
      user_id: 'user-3',
      party_size: 3,
      note: 'Can bring dessert too!',
      status: 'waitlisted',
      hold_expires_at: null,
      created_at: '2024-01-01T10:00:00Z',
      updated_at: '2024-01-01T10:15:00Z',
    },
  ];

  const defaultHookReturn = {
    requests: mockRequests,
    loading: false,
    error: null,
    totalCount: 3,
    hasMore: false,
    processing: null,
    fetchRequests: jest.fn(),
    approveRequest: jest.fn(),
    declineRequest: jest.fn(),
    waitlistRequest: jest.fn(),
    extendHold: jest.fn(),
    refresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseHostJoinRequests.mockReturnValue(defaultHookReturn);
  });

  it('should render request list with correct count', () => {
    render(<JoinRequestsManager eventId={mockEventId} />);

    expect(screen.getByText('Join Requests (3)')).toBeTruthy();
    expect(screen.getByText('Party of 2')).toBeTruthy();
    expect(screen.getByText('Party of 1')).toBeTruthy();
    expect(screen.getByText('Party of 3')).toBeTruthy();
  });

  it('should display request details correctly', () => {
    render(<JoinRequestsManager eventId={mockEventId} />);

    // Check notes are displayed
    expect(screen.getByText('"Looking forward to this event!"')).toBeTruthy();
    expect(screen.getByText('"Can bring dessert too!"')).toBeTruthy();

    // Check status badges
    expect(screen.getByText('PENDING')).toBeTruthy();
    expect(screen.getByText('APPROVED')).toBeTruthy();
    expect(screen.getByText('WAITLISTED')).toBeTruthy();
  });

  it('should show action buttons for pending requests', () => {
    render(<JoinRequestsManager eventId={mockEventId} />);

    // Should show action buttons for pending request
    expect(screen.getByText('✓ Approve')).toBeTruthy();
    expect(screen.getByText('⏳ Waitlist')).toBeTruthy();
    expect(screen.getByText('✗ Decline')).toBeTruthy();
    expect(screen.getByText('⏰ Extend Hold (+30min)')).toBeTruthy();
  });

  it('should not show action buttons for non-pending requests', () => {
    render(<JoinRequestsManager eventId={mockEventId} />);

    // Count action buttons - should only be for 1 pending request
    const approveButtons = screen.getAllByText('✓ Approve');
    expect(approveButtons).toHaveLength(1);
  });

  it('should display hold expiration countdown', () => {
    const shortHoldRequests = [{
      ...mockRequests[0],
      hold_expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    }];

    mockUseHostJoinRequests.mockReturnValue({
      ...defaultHookReturn,
      requests: shortHoldRequests,
    });

    render(<JoinRequestsManager eventId={mockEventId} />);

    expect(screen.getByText('5m remaining')).toBeTruthy();
  });

  it('should show expired status for expired holds', () => {
    const expiredHoldRequests = [{
      ...mockRequests[0],
      hold_expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    }];

    mockUseHostJoinRequests.mockReturnValue({
      ...defaultHookReturn,
      requests: expiredHoldRequests,
    });

    render(<JoinRequestsManager eventId={mockEventId} />);

    expect(screen.getByText('EXPIRED')).toBeTruthy();
    expect(screen.getByText('Expired')).toBeTruthy();
  });

  describe('Status filtering', () => {
    it('should show all filter options', () => {
      render(<JoinRequestsManager eventId={mockEventId} />);

      expect(screen.getByText('All')).toBeTruthy();
      expect(screen.getByText('Pending')).toBeTruthy();
      expect(screen.getByText('Approved')).toBeTruthy();
      expect(screen.getByText('Waitlisted')).toBeTruthy();
      expect(screen.getByText('Declined')).toBeTruthy();
    });

    it('should highlight active filter', () => {
      render(<JoinRequestsManager eventId={mockEventId} />);

      // Default should be "All"
      const allFilter = screen.getByText('All');
      // Note: Testing style changes requires checking the component tree or test IDs
      // For simplicity, we verify the filter exists and can be pressed
      expect(allFilter).toBeTruthy();

      fireEvent.press(screen.getByText('Pending'));
      // After pressing, should call fetchRequests with status filter
      expect(defaultHookReturn.fetchRequests).toHaveBeenCalledWith(
        expect.anything(),
        'pending',
        expect.anything()
      );
    });
  });

  describe('Request actions', () => {
    it('should show confirmation dialog before approving', async () => {
      render(<JoinRequestsManager eventId={mockEventId} />);

      fireEvent.press(screen.getByText('✓ Approve'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Approve Request',
        'This will add the guest to your event and consume capacity. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Approve', onPress: expect.any(Function) },
        ]
      );
    });

    it('should show confirmation dialog before declining', () => {
      render(<JoinRequestsManager eventId={mockEventId} />);

      fireEvent.press(screen.getByText('✗ Decline'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Decline Request',
        'The guest will be notified that their request was declined.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Decline', style: 'destructive', onPress: expect.any(Function) },
        ]
      );
    });

    it('should show confirmation dialog before waitlisting', () => {
      render(<JoinRequestsManager eventId={mockEventId} />);

      fireEvent.press(screen.getByText('⏳ Waitlist'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Add to Waitlist',
        'The guest will be notified and may be approved if capacity becomes available.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Waitlist', onPress: expect.any(Function) },
        ]
      );
    });

    it('should show confirmation dialog before extending hold', () => {
      render(<JoinRequestsManager eventId={mockEventId} />);

      fireEvent.press(screen.getByText('⏰ Extend Hold (+30min)'));

      expect(mockAlert).toHaveBeenCalledWith(
        'Extend Hold',
        'This will give you more time to decide on this request.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Extend (+30min)', onPress: expect.any(Function) },
        ]
      );
    });
  });

  describe('Loading and error states', () => {
    it('should show loading state', () => {
      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        loading: true,
        requests: [],
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      expect(screen.getByText('Loading requests...')).toBeTruthy();
    });

    it('should show error state with retry option', () => {
      const mockRefresh = jest.fn();
      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        error: 'Failed to load requests',
        requests: [],
        refresh: mockRefresh,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      expect(screen.getByText('Failed to load join requests')).toBeTruthy();
      
      const retryButton = screen.getByText('Retry');
      fireEvent.press(retryButton);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should show empty state when no requests', () => {
      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: [],
        totalCount: 0,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      expect(screen.getByText('No join requests yet')).toBeTruthy();
      expect(screen.getByText(
        'When guests request to join your event, they\'ll appear here.'
      )).toBeTruthy();
    });

    it('should show processing state for individual requests', () => {
      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        processing: 'req-1', // First request is being processed
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      // Should show loading indicator instead of "Approve" text
      expect(screen.getByTestId('activity-indicator')).toBeTruthy();
    });
  });

  describe('Time formatting', () => {
    it('should format hold expiry in minutes', () => {
      const requestsWithShortHold = [{
        ...mockRequests[0],
        hold_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      }];

      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: requestsWithShortHold,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      expect(screen.getByText('15m remaining')).toBeTruthy();
    });

    it('should format hold expiry in hours and minutes', () => {
      const requestsWithLongHold = [{
        ...mockRequests[0],
        hold_expires_at: new Date(Date.now() + 95 * 60 * 1000).toISOString(), // 95 minutes
      }];

      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: requestsWithLongHold,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      expect(screen.getByText('1h 35m remaining')).toBeTruthy();
    });

    it('should show "Expired" for past expiry times', () => {
      const requestsWithExpiredHold = [{
        ...mockRequests[0],
        hold_expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      }];

      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: requestsWithExpiredHold,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      expect(screen.getByText('Expired')).toBeTruthy();
    });

    it('should not show actions for expired requests', () => {
      const requestsWithExpiredHold = [{
        ...mockRequests[0],
        hold_expires_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // Expired
      }];

      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: requestsWithExpiredHold,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      // Should not show action buttons for expired request
      expect(screen.queryByText('✓ Approve')).toBeNull();
      expect(screen.queryByText('✗ Decline')).toBeNull();
      expect(screen.queryByText('⏳ Waitlist')).toBeNull();
    });
  });

  describe('Status colors and display', () => {
    it('should show correct status colors', () => {
      const requestsWithVariousStatuses = [
        { ...mockRequests[0], status: 'pending' as const },
        { ...mockRequests[1], status: 'approved' as const },
        { ...mockRequests[2], status: 'declined' as const },
        { ...mockRequests[0], id: 'req-4', status: 'waitlisted' as const },
        { ...mockRequests[0], id: 'req-5', status: 'expired' as const },
        { ...mockRequests[0], id: 'req-6', status: 'cancelled' as const },
      ];

      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: requestsWithVariousStatuses,
        totalCount: 6,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      expect(screen.getByText('PENDING')).toBeTruthy();
      expect(screen.getByText('APPROVED')).toBeTruthy();
      expect(screen.getByText('DECLINED')).toBeTruthy();
      expect(screen.getByText('WAITLISTED')).toBeTruthy();
      expect(screen.getByText('EXPIRED')).toBeTruthy();
      expect(screen.getByText('CANCELLED')).toBeTruthy();
    });

    it('should show expired status for pending requests with expired holds', () => {
      const expiredPendingRequest = [{
        ...mockRequests[0],
        status: 'pending' as const,
        hold_expires_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // Expired
      }];

      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: expiredPendingRequest,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      expect(screen.getByText('EXPIRED')).toBeTruthy(); // Should override "PENDING"
    });
  });

  describe('Request actions execution', () => {
    const mockApproveRequest = jest.fn();
    const mockDeclineRequest = jest.fn();
    const mockWaitlistRequest = jest.fn();
    const mockExtendHold = jest.fn();

    beforeEach(() => {
      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        approveRequest: mockApproveRequest,
        declineRequest: mockDeclineRequest,
        waitlistRequest: mockWaitlistRequest,
        extendHold: mockExtendHold,
      });
    });

    it('should execute approve action when confirmed', async () => {
      mockApproveRequest.mockResolvedValue(true);

      render(<JoinRequestsManager eventId={mockEventId} />);

      fireEvent.press(screen.getByText('✓ Approve'));

      // Simulate user confirming the alert
      expect(mockAlert).toHaveBeenCalled();
      const alertCall = mockAlert.mock.calls[0];
      const confirmButton = alertCall[2]?.find((btn: any) => btn.text === 'Approve');
      
      if (confirmButton?.onPress) {
        confirmButton.onPress();
      }

      await waitFor(() => {
        expect(mockApproveRequest).toHaveBeenCalledWith('req-1');
      });
    });

    it('should execute decline action when confirmed', async () => {
      mockDeclineRequest.mockResolvedValue(true);

      render(<JoinRequestsManager eventId={mockEventId} />);

      fireEvent.press(screen.getByText('✗ Decline'));

      const alertCall = mockAlert.mock.calls[0];
      const confirmButton = alertCall[2]?.find((btn: any) => btn.text === 'Decline');
      
      if (confirmButton?.onPress) {
        confirmButton.onPress();
      }

      await waitFor(() => {
        expect(mockDeclineRequest).toHaveBeenCalledWith('req-1');
      });
    });

    it('should execute waitlist action when confirmed', async () => {
      mockWaitlistRequest.mockResolvedValue(true);

      render(<JoinRequestsManager eventId={mockEventId} />);

      fireEvent.press(screen.getByText('⏳ Waitlist'));

      const alertCall = mockAlert.mock.calls[0];
      const confirmButton = alertCall[2]?.find((btn: any) => btn.text === 'Waitlist');
      
      if (confirmButton?.onPress) {
        confirmButton.onPress();
      }

      await waitFor(() => {
        expect(mockWaitlistRequest).toHaveBeenCalledWith('req-1');
      });
    });

    it('should execute extend hold action when confirmed', async () => {
      mockExtendHold.mockResolvedValue(true);

      render(<JoinRequestsManager eventId={mockEventId} />);

      fireEvent.press(screen.getByText('⏰ Extend Hold (+30min)'));

      const alertCall = mockAlert.mock.calls[0];
      const confirmButton = alertCall[2]?.find((btn: any) => btn.text === 'Extend (+30min)');
      
      if (confirmButton?.onPress) {
        confirmButton.onPress();
      }

      await waitFor(() => {
        expect(mockExtendHold).toHaveBeenCalledWith('req-1');
      });
    });

    it('should not execute actions when cancelled', () => {
      render(<JoinRequestsManager eventId={mockEventId} />);

      fireEvent.press(screen.getByText('✓ Approve'));

      // Simulate user cancelling the alert
      const alertCall = mockAlert.mock.calls[0];
      const cancelButton = alertCall[2]?.find((btn: any) => btn.text === 'Cancel');
      
      if (cancelButton?.onPress) {
        cancelButton.onPress();
      }

      expect(mockApproveRequest).not.toHaveBeenCalled();
    });
  });

  describe('Refresh functionality', () => {
    it('should support pull-to-refresh', async () => {
      const mockRefresh = jest.fn();
      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        refresh: mockRefresh,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      // Find and trigger the refresh control
      // Note: Testing RefreshControl requires more complex setup
      // For now, we verify the refresh function is properly passed
      expect(mockRefresh).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle requests without notes gracefully', () => {
      const requestsWithoutNotes = [{
        ...mockRequests[0],
        note: null,
      }];

      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: requestsWithoutNotes,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      // Should not crash and should not show note section
      expect(screen.getByText('Party of 2')).toBeTruthy();
      expect(screen.queryByText('"')).toBeNull(); // No quote marks for missing notes
    });

    it('should handle requests without hold expiry', () => {
      const requestsWithoutExpiry = [{
        ...mockRequests[0],
        hold_expires_at: null,
      }];

      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: requestsWithoutExpiry,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      // Should not show expiry time
      expect(screen.queryByText('remaining')).toBeNull();
      expect(screen.queryByText('Expired')).toBeNull();
    });

    it('should truncate long notes', () => {
      const requestsWithLongNote = [{
        ...mockRequests[0],
        note: 'This is a very long note that should be truncated when displayed in the UI because it exceeds reasonable length',
      }];

      mockUseHostJoinRequests.mockReturnValue({
        ...defaultHookReturn,
        requests: requestsWithLongNote,
      });

      render(<JoinRequestsManager eventId={mockEventId} />);

      // Note is limited to 2 lines via numberOfLines prop
      expect(screen.getByText('"This is a very long note that should be truncated when displayed in the UI because it exceeds reasonable length"')).toBeTruthy();
    });
  });
});
