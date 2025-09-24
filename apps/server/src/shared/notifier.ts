// ===============================================
// Notification service stub
// For production, integrate with email/push/SMS providers
// ===============================================

export interface NotificationPayload {
  type: string;
  userId: string;
  data: Record<string, unknown>;
}

interface JoinRequestNotificationData {
  requestId: string;
  eventId: string;
  eventTitle?: string;
  partySize: number;
  requesterId?: string;
  requesterName?: string;
  holdExpiresAt?: string;
  hostId?: string;
}

/**
 * Notification types for join request system
 */
export type JoinRequestNotificationType = 
  | 'join_request_received'    // Host: new request received
  | 'request_approved'         // Guest: request approved
  | 'request_declined'         // Guest: request declined  
  | 'request_waitlisted'       // Guest: request waitlisted
  | 'hold_extended'           // Guest: hold extended
  | 'hold_expiring_soon'      // Guest: hold expires in 10 minutes
  | 'hold_expired';           // Guest: hold has expired

/**
 * Send notification (stub implementation)
 * In production, this would integrate with:
 * - Email service (SendGrid, SES, etc.)
 * - Push notifications (Firebase, etc.) 
 * - SMS service (Twilio, etc.)
 * - In-app notifications
 */
export function sendJoinRequestNotification(
  type: JoinRequestNotificationType,
  data: JoinRequestNotificationData
): void {
  console.log(`[NOTIFIER] ${type}`, {
    requestId: data.requestId,
    eventId: data.eventId,
    userId: getTargetUserId(type, data),
    timestamp: new Date().toISOString(),
  });

  // Notification content templates
  const messages = getNotificationMessages(type, data);
  
  // TODO: Replace with actual notification providers
  switch (type) {
    case 'join_request_received':
      // Notify host via email/push
      console.log(`[EMAIL] To host ${data.hostId}: ${messages.subject}`);
      console.log(`[PUSH] To host ${data.hostId}: ${messages.body}`);
      break;
      
    case 'request_approved':
    case 'request_declined': 
    case 'request_waitlisted':
      // Notify requester via email/push
      console.log(`[EMAIL] To user ${data.requesterId}: ${messages.subject}`);
      console.log(`[PUSH] To user ${data.requesterId}: ${messages.body}`);
      break;
      
    case 'hold_extended':
    case 'hold_expiring_soon':
    case 'hold_expired':
      // Notify requester via push (time-sensitive)
      console.log(`[PUSH] To user ${data.requesterId}: ${messages.body}`);
      break;
  }
}

/**
 * Get notification message templates
 */
function getNotificationMessages(
  type: JoinRequestNotificationType, 
  data: JoinRequestNotificationData
) {
  const eventTitle = data.eventTitle || 'Event';
  const partySize = data.partySize;
  const requesterName = data.requesterName || 'Someone';
  
  switch (type) {
    case 'join_request_received':
      return {
        subject: `New join request for ${eventTitle}`,
        body: `${requesterName} wants to join ${eventTitle} with ${partySize} ${partySize === 1 ? 'person' : 'people'}.`,
      };
      
    case 'request_approved':
      return {
        subject: `You're in! Request approved for ${eventTitle}`,
        body: `Great news! Your request to join ${eventTitle} has been approved.`,
      };
      
    case 'request_declined':
      return {
        subject: `Request declined for ${eventTitle}`,
        body: `Unfortunately, your request to join ${eventTitle} was declined.`,
      };
      
    case 'request_waitlisted':
      return {
        subject: `You're on the waitlist for ${eventTitle}`,
        body: `Your request to join ${eventTitle} has been added to the waitlist.`,
      };
      
    case 'hold_extended':
      return {
        subject: `Hold extended for ${eventTitle}`,
        body: `Good news! Your hold for ${eventTitle} has been extended.`,
      };
      
    case 'hold_expiring_soon':
      return {
        subject: `Your hold expires soon for ${eventTitle}`,
        body: `Your capacity hold for ${eventTitle} expires in 10 minutes. The host may approve or decline soon.`,
      };
      
    case 'hold_expired':
      return {
        subject: `Your hold has expired for ${eventTitle}`,
        body: `Your capacity hold for ${eventTitle} has expired. You can submit a new request if spots are available.`,
      };
      
    default:
      return {
        subject: `Update for ${eventTitle}`,
        body: 'You have an update for your join request.',
      };
  }
}

/**
 * Get the target user ID for the notification
 */
function getTargetUserId(
  type: JoinRequestNotificationType,
  data: JoinRequestNotificationData
): string | undefined {
  switch (type) {
    case 'join_request_received':
      return data.hostId;
    case 'request_approved':
    case 'request_declined':
    case 'request_waitlisted':
    case 'hold_extended':
    case 'hold_expiring_soon':
    case 'hold_expired':
      return data.requesterId;
    default:
      return undefined;
  }
}

/**
 * Batch notification for multiple recipients
 */
export function sendBatchNotifications(
  notifications: Array<{
    type: JoinRequestNotificationType;
    data: JoinRequestNotificationData;
  }>
): void {
  notifications.forEach(({ type, data }) => {
    sendJoinRequestNotification(type, data);
  });
}

/**
 * Schedule notification for future delivery (e.g., hold expiring soon)
 */
export function scheduleNotification(
  type: JoinRequestNotificationType,
  data: JoinRequestNotificationData,
  deliverAt: Date
): void {
  console.log(`[NOTIFIER] Scheduled ${type} for ${deliverAt.toISOString()}`, data);
  
  // TODO: Integrate with job queue (Bull, Agenda, etc.)
  // For now, use setTimeout for demo (not production ready)
  const delay = deliverAt.getTime() - Date.now();
  if (delay > 0) {
    setTimeout(() => {
      sendJoinRequestNotification(type, data);
    }, delay);
  }
}
