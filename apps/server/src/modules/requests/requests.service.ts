import { ServiceResult, ServiceError } from '../../utils/helper';
import { RequestsRepository } from './requests.repo';
import logger from '../../logger';
import type {
  JoinRequestType,
  JoinRequestAddType,
  PaginatedJoinRequestsType,
  AvailabilityType,
  ListRequestsQueryType,
  RequestErrorCode,
} from './requests.types';

// ===============================================
// Service layer for join requests business logic  
// ===============================================

export class RequestsService {
  private static readonly DEFAULT_HOLD_TTL = 30; // minutes

  /**
   * Get event availability for capacity planning
   */
  static async getEventAvailability(eventId: string): Promise<ServiceResult<AvailabilityType>> {
    logger.info('[RequestsService] Getting event availability', { eventId });

    const result = await RequestsRepository.getEventAvailability(eventId);
    if (!result.ok) return result;

    return { ok: true, data: result.data };
  }

  /**
   * Create a join request with soft capacity hold
   */
  static async createJoinRequest(
    eventId: string,
    userId: string,
    input: JoinRequestAddType
  ): Promise<ServiceResult<JoinRequestType>> {
    logger.info('[RequestsService] Creating join request', { eventId, userId, input });

    // 1. Check if user already has a pending request
    const hasExisting = await RequestsRepository.hasExistingRequest(eventId, userId);
    if (hasExisting) {
      return { ok: false, error: 'Already have a pending request for this event', code: '409' };
    }

    // 2. Check capacity availability before creating request
    const availabilityResult = await RequestsRepository.getEventAvailability(eventId);
    if (!availabilityResult.ok) {
      return availabilityResult as ServiceError;
    }

    if (availabilityResult.data.available < input.party_size) {
      return { 
        ok: false, 
        error: `Insufficient capacity: need ${input.party_size}, have ${availabilityResult.data.available}`, 
        code: '409' 
      };
    }

    // 3. Get hold TTL from environment 
    const holdTtl = this.getHoldTtlMinutes();

    // 4. Create the request with hold
    const result = await RequestsRepository.createRequest(
      eventId,
      userId,
      input.party_size,
      input.note,
      holdTtl
    );

    if (!result.ok) return result;

    logger.info('[RequestsService] Join request created successfully', { 
      requestId: result.data.id,
      eventId,
      userId 
    });

    return { ok: true, data: this.transformRowToApi(result.data) };
  }

  /**
   * List join requests for an event (host-only)
   */
  static async listJoinRequests(
    eventId: string,
    hostUserId: string,
    query: ListRequestsQueryType
  ): Promise<ServiceResult<PaginatedJoinRequestsType>> {
    logger.info('[RequestsService] Listing join requests', { eventId, hostUserId, query });

    // Note: Authorization should be handled by RLS policies
    // This service method assumes the caller has already verified host permissions
    
    return await RequestsRepository.listEventRequests(eventId, query);
  }

  /**
   * Approve a join request (host-only, atomic capacity check)
   */
  static async approveRequest(
    requestId: string,
    hostUserId: string
  ): Promise<ServiceResult<JoinRequestType>> {
    logger.info('[RequestsService] Approving request', { requestId, hostUserId });

    // The repository handles atomic capacity checking via stored procedure
    const result = await RequestsRepository.updateRequestStatus(
      requestId, 
      'approved', 
      'pending'
    );

    if (!result.ok) return result;

    logger.info('[RequestsService] Request approved successfully', { 
      requestId,
      hostUserId 
    });

    // TODO: Send notification to requester
    this.sendNotification('request_approved', result.data);

    return { ok: true, data: this.transformRowToApi(result.data) };
  }

  /**
   * Decline a join request (host-only)
   */
  static async declineRequest(
    requestId: string,
    hostUserId: string
  ): Promise<ServiceResult<JoinRequestType>> {
    logger.info('[RequestsService] Declining request', { requestId, hostUserId });

    const result = await RequestsRepository.updateRequestStatus(
      requestId,
      'declined',
      'pending'
    );

    if (!result.ok) return result;

    logger.info('[RequestsService] Request declined successfully', { requestId, hostUserId });

    // TODO: Send notification to requester
    this.sendNotification('request_declined', result.data);

    return { ok: true, data: this.transformRowToApi(result.data) };
  }

  /**
   * Move a join request to waitlist (host-only)
   */
  static async waitlistRequest(
    requestId: string,
    hostUserId: string
  ): Promise<ServiceResult<JoinRequestType>> {
    logger.info('[RequestsService] Waitlisting request', { requestId, hostUserId });

    const result = await RequestsRepository.updateRequestStatus(
      requestId,
      'waitlisted',
      'pending'
    );

    if (!result.ok) return result;

    logger.info('[RequestsService] Request waitlisted successfully', { requestId, hostUserId });

    // TODO: Send notification to requester  
    this.sendNotification('request_waitlisted', result.data);

    return { ok: true, data: this.transformRowToApi(result.data) };
  }

  /**
   * Cancel a join request (guest cancels own request)
   */
  static async cancelRequest(
    requestId: string,
    userId: string
  ): Promise<ServiceResult<JoinRequestType>> {
    logger.info('[RequestsService] Cancelling request', { requestId, userId });

    // First get the request to verify ownership and status
    const requestResult = await RequestsRepository.getRequest(requestId);
    if (!requestResult.ok) return requestResult;

    const request = requestResult.data;

    // Check ownership
    if (request.user_id !== userId) {
      return { ok: false, error: 'Not authorized to cancel this request', code: '403' };
    }

    // Check if request can be cancelled
    if (request.status !== 'pending') {
      return { ok: false, error: 'Can only cancel pending requests', code: '409' };
    }

    // Check if hold has expired
    if (request.hold_expires_at) {
      const holdExpiry = new Date(request.hold_expires_at);
      if (holdExpiry <= new Date()) {
        return { ok: false, error: 'Request hold has expired', code: '409' };
      }
    }

    const result = await RequestsRepository.updateRequestStatus(
      requestId,
      'cancelled',
      'pending'
    );

    if (!result.ok) return result;

    logger.info('[RequestsService] Request cancelled successfully', { requestId, userId });

    return { ok: true, data: this.transformRowToApi(result.data) };
  }

  /**
   * Extend hold expiration (host-only, optional feature)
   */
  static async extendRequestHold(
    requestId: string,
    hostUserId: string,
    extensionMinutes: number = 30
  ): Promise<ServiceResult<JoinRequestType>> {
    logger.info('[RequestsService] Extending request hold', { 
      requestId, 
      hostUserId, 
      extensionMinutes 
    });

    // Validate extension duration
    if (extensionMinutes < 5 || extensionMinutes > 120) {
      return { ok: false, error: 'Extension must be between 5 and 120 minutes', code: '400' };
    }

    const result = await RequestsRepository.extendHold(requestId, extensionMinutes);
    if (!result.ok) return result;

    logger.info('[RequestsService] Request hold extended successfully', { 
      requestId, 
      hostUserId 
    });

    // TODO: Send notification to requester about extension
    this.sendNotification('hold_extended', result.data);

    return { ok: true, data: this.transformRowToApi(result.data) };
  }

  /**
   * Expire outstanding holds (for background job)
   */
  static async expireHolds(): Promise<ServiceResult<{ expired: number }>> {
    logger.info('[RequestsService] Running hold expiration job');

    try {
      const { supabase } = await import('../../config/supabaseClient');
      const { data, error } = await supabase.rpc('expire_join_request_holds');

      if (error) {
        logger.error('[RequestsService] Failed to expire holds', { error });
        return { ok: false, error: 'Failed to expire holds', code: '500' };
      }

      const expiredCount = data || 0;
      logger.info('[RequestsService] Hold expiration completed', { expiredCount });

      return { ok: true, data: { expired: expiredCount } };
    } catch (err) {
      logger.error('[RequestsService] Exception during hold expiration', { err });
      return { ok: false, error: 'Exception during hold expiration', code: '500' };
    }
  }

  // ===============================================
  // Private helper methods
  // ===============================================

  /**
   * Get hold TTL from environment with fallback
   */
  private static getHoldTtlMinutes(): number {
    const envTtl = process.env.JOIN_HOLD_TTL_MIN;
    if (envTtl) {
      const parsed = parseInt(envTtl, 10);
      if (!isNaN(parsed) && parsed >= 5 && parsed <= 120) {
        return parsed;
      }
    }
    return this.DEFAULT_HOLD_TTL;
  }

  /**
   * Transform database row to API format
   */
  private static transformRowToApi(row: any): JoinRequestType {
    return {
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      party_size: row.party_size,
      note: row.note,
      status: row.status,
      hold_expires_at: row.hold_expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Send notification (stub - implement with actual notification provider)
   */
  private static sendNotification(type: string, request: any): void {
    // TODO: Integrate with notification service
    logger.info('[RequestsService] Notification stub', { 
      type, 
      requestId: request.id,
      userId: request.user_id 
    });

    // Notification payloads for different events:
    switch (type) {
      case 'join_request_received':
        // Notify host: new join request received
        console.log(`[NOTIFIER] join_request_received for request ${request.id}`);
        break;
      case 'request_approved':
        // Notify guest: request approved
        console.log(`[NOTIFIER] request_approved for user ${request.user_id}`);
        break;
      case 'request_declined':
        // Notify guest: request declined
        console.log(`[NOTIFIER] request_declined for user ${request.user_id}`);
        break;
      case 'request_waitlisted':
        // Notify guest: request waitlisted
        console.log(`[NOTIFIER] request_waitlisted for user ${request.user_id}`);
        break;
      case 'hold_extended':
        // Notify guest: hold extended
        console.log(`[NOTIFIER] hold_extended for user ${request.user_id}`);
        break;
      default:
        logger.warn('[RequestsService] Unknown notification type', { type });
    }
  }
}
