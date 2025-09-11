import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  sendJoinRequestNotification, 
  sendBatchNotifications, 
  scheduleNotification 
} from '../../../src/shared/notifier';

// Mock console methods
const mockConsoleLog = vi.fn();
const mockConsoleWarn = vi.fn();

vi.stubGlobal('console', {
  log: mockConsoleLog,
  warn: mockConsoleWarn,
  error: vi.fn(),
  info: vi.fn(),
});

describe('Notifier', () => {
  const mockNotificationData = {
    requestId: 'request-123',
    eventId: 'event-456',
    eventTitle: 'Summer BBQ',
    partySize: 2,
    requesterId: 'user-requester',
    requesterName: 'John Doe',
    hostId: 'user-host',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sendJoinRequestNotification', () => {
    it('should log join_request_received notification for host', () => {
      sendJoinRequestNotification('join_request_received', mockNotificationData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[NOTIFIER] join_request_received',
        expect.objectContaining({
          requestId: 'request-123',
          eventId: 'event-456',
          userId: 'user-host', // Should target host
          timestamp: expect.any(String),
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[EMAIL] To host user-host: New join request for Summer BBQ'
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PUSH] To host user-host: John Doe wants to join Summer BBQ with 2 people.'
      );
    });

    it('should log request_approved notification for guest', () => {
      sendJoinRequestNotification('request_approved', mockNotificationData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[NOTIFIER] request_approved',
        expect.objectContaining({
          userId: 'user-requester', // Should target requester
        })
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[EMAIL] To user user-requester: You\'re in! Request approved for Summer BBQ'
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PUSH] To user user-requester: Great news! Your request to join Summer BBQ has been approved.'
      );
    });

    it('should log request_declined notification for guest', () => {
      sendJoinRequestNotification('request_declined', mockNotificationData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[EMAIL] To user user-requester: Request declined for Summer BBQ'
      );

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PUSH] To user user-requester: Unfortunately, your request to join Summer BBQ was declined.'
      );
    });

    it('should log request_waitlisted notification for guest', () => {
      sendJoinRequestNotification('request_waitlisted', mockNotificationData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[EMAIL] To user user-requester: You\'re on the waitlist for Summer BBQ'
      );
    });

    it('should log hold_extended notification for guest', () => {
      sendJoinRequestNotification('hold_extended', mockNotificationData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PUSH] To user user-requester: Good news! Your hold for Summer BBQ has been extended.'
      );
    });

    it('should log hold_expiring_soon notification for guest', () => {
      sendJoinRequestNotification('hold_expiring_soon', mockNotificationData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PUSH] To user user-requester: Your capacity hold for Summer BBQ expires in 10 minutes. The host may approve or decline soon.'
      );
    });

    it('should log hold_expired notification for guest', () => {
      sendJoinRequestNotification('hold_expired', mockNotificationData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PUSH] To user user-requester: Your capacity hold for Summer BBQ has expired. You can submit a new request if spots are available.'
      );
    });
  });

  describe('Message formatting', () => {
    it('should handle singular party size correctly', () => {
      const singlePartyData = {
        ...mockNotificationData,
        partySize: 1,
      };

      sendJoinRequestNotification('join_request_received', singlePartyData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PUSH] To host user-host: John Doe wants to join Summer BBQ with 1 person.'
      );
    });

    it('should handle plural party size correctly', () => {
      const multiPartyData = {
        ...mockNotificationData,
        partySize: 5,
      };

      sendJoinRequestNotification('join_request_received', multiPartyData);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PUSH] To host user-host: John Doe wants to join Summer BBQ with 5 people.'
      );
    });

    it('should handle missing event title', () => {
      const dataWithoutTitle = {
        ...mockNotificationData,
        eventTitle: undefined,
      };

      sendJoinRequestNotification('request_approved', dataWithoutTitle);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[EMAIL] To user user-requester: You\'re in! Request approved for Event'
      );
    });

    it('should handle missing requester name', () => {
      const dataWithoutName = {
        ...mockNotificationData,
        requesterName: undefined,
      };

      sendJoinRequestNotification('join_request_received', dataWithoutName);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[PUSH] To host user-host: Someone wants to join Summer BBQ with 2 people.'
      );
    });
  });

  describe('sendBatchNotifications', () => {
    it('should send multiple notifications', () => {
      const notifications = [
        {
          type: 'request_approved' as const,
          data: { ...mockNotificationData, requesterId: 'user-1' },
        },
        {
          type: 'request_declined' as const,
          data: { ...mockNotificationData, requesterId: 'user-2' },
        },
        {
          type: 'request_waitlisted' as const,
          data: { ...mockNotificationData, requesterId: 'user-3' },
        },
      ];

      sendBatchNotifications(notifications);

      // Should call sendJoinRequestNotification for each
      expect(mockConsoleLog).toHaveBeenCalledTimes(notifications.length * 3); // Each notification logs 3 times
    });

    it('should handle empty batch gracefully', () => {
      sendBatchNotifications([]);

      expect(mockConsoleLog).not.toHaveBeenCalled();
    });
  });

  describe('scheduleNotification', () => {
    it('should schedule notification for future delivery', async () => {
      const futureTime = new Date(Date.now() + 1000); // 1 second from now

      scheduleNotification('hold_expiring_soon', mockNotificationData, futureTime);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[NOTIFIER] Scheduled hold_expiring_soon for ' + futureTime.toISOString(),
        mockNotificationData
      );

      // Fast-forward time
      vi.advanceTimersByTime(1100);

      // Should have sent the notification
      await vi.waitFor(() => {
        expect(mockConsoleLog).toHaveBeenCalledWith(
          '[NOTIFIER] hold_expiring_soon',
          expect.any(Object)
        );
      });
    });

    it('should not schedule notification for past delivery time', () => {
      const pastTime = new Date(Date.now() - 1000); // 1 second ago

      scheduleNotification('hold_expired', mockNotificationData, pastTime);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[NOTIFIER] Scheduled hold_expired for ' + pastTime.toISOString(),
        mockNotificationData
      );

      // Should not have scheduled anything
      vi.advanceTimersByTime(5000);
      
      // Should not have sent notification since time was in the past
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        '[NOTIFIER] hold_expired',
        expect.any(Object)
      );
    });

    it('should handle scheduling multiple notifications', () => {
      const time1 = new Date(Date.now() + 500);
      const time2 = new Date(Date.now() + 1000);
      const time3 = new Date(Date.now() + 1500);

      scheduleNotification('hold_expiring_soon', { ...mockNotificationData, requestId: 'req-1' }, time1);
      scheduleNotification('hold_expired', { ...mockNotificationData, requestId: 'req-2' }, time2);
      scheduleNotification('hold_extended', { ...mockNotificationData, requestId: 'req-3' }, time3);

      vi.advanceTimersByTime(2000);

      // All should have been triggered
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[NOTIFIER] hold_expiring_soon',
        expect.objectContaining({ requestId: 'req-1' })
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[NOTIFIER] hold_expired',
        expect.objectContaining({ requestId: 'req-2' })
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[NOTIFIER] hold_extended',
        expect.objectContaining({ requestId: 'req-3' })
      );
    });
  });

  describe('Target user identification', () => {
    it('should target correct users for different notification types', () => {
      const hostNotificationTypes = ['join_request_received'];
      const guestNotificationTypes = [
        'request_approved', 
        'request_declined', 
        'request_waitlisted',
        'hold_extended',
        'hold_expiring_soon',
        'hold_expired'
      ];

      hostNotificationTypes.forEach(type => {
        sendJoinRequestNotification(type as any, mockNotificationData);
        expect(mockConsoleLog).toHaveBeenCalledWith(
          `[NOTIFIER] ${type}`,
          expect.objectContaining({
            userId: 'user-host',
          })
        );
      });

      vi.clearAllMocks();

      guestNotificationTypes.forEach(type => {
        sendJoinRequestNotification(type as any, mockNotificationData);
        expect(mockConsoleLog).toHaveBeenCalledWith(
          `[NOTIFIER] ${type}`,
          expect.objectContaining({
            userId: 'user-requester',
          })
        );
      });
    });
  });
});
