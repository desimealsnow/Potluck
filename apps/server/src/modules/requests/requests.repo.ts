import { supabase } from '../../config/supabaseClient';
import { ServiceResult, mapDbError } from '../../utils/helper';
import logger from '../../logger';
import type { 
  JoinRequestType, 
  JoinRequestRow, 
  AvailabilityRow,
  PaginatedJoinRequestsType,
  ListRequestsQueryType
} from './requests.types';

// ===============================================
// Repository layer for join requests
// ===============================================

export class RequestsRepository {
  
  /**
   * Get event availability (total, confirmed, held, available)
   */
  static async getEventAvailability(eventId: string): Promise<ServiceResult<AvailabilityRow>> {
    try {
      const { data, error } = await supabase.rpc('availability_for_event', {
        event_uuid: eventId
      });

      if (error) {
        logger.error('[RequestsRepo] Failed to get availability', { eventId, error });
        return mapDbError(error);
      }

      if (!data || data.length === 0) {
        return { ok: false, error: 'Event not found', code: '404' };
      }

      return { ok: true, data: data[0] as AvailabilityRow };
    } catch (err) {
      logger.error('[RequestsRepo] Exception getting availability', { eventId, err });
      return { ok: false, error: 'Failed to get availability', code: '500' };
    }
  }

  /**
   * Create a new join request with capacity hold
   */
  static async createRequest(
    eventId: string,
    userId: string,
    partySize: number,
    note?: string,
    holdTtlMinutes = 30
  ): Promise<ServiceResult<JoinRequestRow>> {
    try {
      // Use RPC to atomically process the request
      const { data, error } = await supabase.rpc('process_join_request', {
        p_event_id: eventId,
        p_user_id: userId,
        p_party_size: partySize,
        p_note: note || null,
        p_hold_ttl_minutes: holdTtlMinutes,
        p_auto_approve: false,
      });

      if (error) {
        logger.error('[RequestsRepo] Failed to create request', { eventId, userId, error });
        
        // Map specific error codes
        if (error.code === '23505') { // unique violation
          return { ok: false, error: 'Already have a pending request for this event', code: '409' };
        }
        
        return mapDbError(error);
      }

      return { ok: true, data: data as JoinRequestRow };
    } catch (err) {
      logger.error('[RequestsRepo] Exception creating request', { eventId, userId, err });
      return { ok: false, error: 'Failed to create request', code: '500' };
    }
  }

  /**
   * Get a specific join request
   */
  static async getRequest(requestId: string): Promise<ServiceResult<JoinRequestRow>> {
    try {
      const { data, error } = await supabase
        .from('event_join_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (error) {
        logger.error('[RequestsRepo] Failed to get request', { requestId, error });
        return mapDbError(error);
      }

      if (!data) {
        return { ok: false, error: 'Request not found', code: '404' };
      }

      return { ok: true, data: data as JoinRequestRow };
    } catch (err) {
      logger.error('[RequestsRepo] Exception getting request', { requestId, err });
      return { ok: false, error: 'Failed to get request', code: '500' };
    }
  }

  /**
   * List join requests for an event (host-only, paginated)
   */
  static async listEventRequests(
    eventId: string,
    query: ListRequestsQueryType
  ): Promise<ServiceResult<PaginatedJoinRequestsType>> {
    try {
      let dbQuery = supabase
        .from('event_join_requests')
        .select('*', { count: 'exact' })
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      // Apply status filter if provided
      if (query.status) {
        dbQuery = dbQuery.eq('status', query.status);
      }

      // Apply pagination
      const { data, error, count } = await dbQuery
        .range(query.offset, query.offset + query.limit - 1);

      if (error) {
        logger.error('[RequestsRepo] Failed to list requests', { eventId, error });
        return mapDbError(error);
      }

      const items = (data || []) as JoinRequestRow[];
      const totalCount = count || 0;
      const nextOffset = query.offset + query.limit < totalCount 
        ? query.offset + query.limit 
        : null;

      return {
        ok: true,
        data: {
          data: items.map(this.transformRowToType),
          nextOffset,
          totalCount,
        },
      };
    } catch (err) {
      logger.error('[RequestsRepo] Exception listing requests', { eventId, err });
      return { ok: false, error: 'Failed to list requests', code: '500' };
    }
  }

  /**
   * Update request status (with optimistic locking via SELECT FOR UPDATE)
   */
  static async updateRequestStatus(
    requestId: string,
    newStatus: string,
    expectedCurrentStatus?: string
  ): Promise<ServiceResult<JoinRequestRow>> {
    try {
      // Use a transaction for atomic update with capacity check for approvals
      const { data, error } = await supabase.rpc('update_request_status', {
        request_id: requestId,
        new_status: newStatus,
        expected_status: expectedCurrentStatus || null,
      });

      if (error) {
        logger.error('[RequestsRepo] Failed to update request status', { 
          requestId, newStatus, error 
        });
        
        // Map specific errors
        if (error.message?.includes('capacity')) {
          return { ok: false, error: 'Insufficient capacity', code: '409' };
        }
        
        if (error.message?.includes('status')) {
          return { ok: false, error: 'Invalid status transition', code: '409' };
        }
        
        return mapDbError(error);
      }

      if (!data) {
        return { ok: false, error: 'Request not found or invalid transition', code: '404' };
      }

      return { ok: true, data: data as JoinRequestRow };
    } catch (err) {
      logger.error('[RequestsRepo] Exception updating request status', { 
        requestId, newStatus, err 
      });
      return { ok: false, error: 'Failed to update request', code: '500' };
    }
  }

  /**
   * Extend hold expiration for a pending request
   */
  static async extendHold(
    requestId: string,
    extensionMinutes: number = 30
  ): Promise<ServiceResult<JoinRequestRow>> {
    try {
      const newHoldExpiry = new Date();
      newHoldExpiry.setMinutes(newHoldExpiry.getMinutes() + extensionMinutes);

      const { data, error } = await supabase
        .from('event_join_requests')
        .update({ 
          hold_expires_at: newHoldExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId)
        .eq('status', 'pending') // Only extend pending requests
        .select('*')
        .single();

      if (error) {
        logger.error('[RequestsRepo] Failed to extend hold', { requestId, error });
        return mapDbError(error);
      }

      if (!data) {
        return { ok: false, error: 'Request not found or not pending', code: '404' };
      }

      return { ok: true, data: data as JoinRequestRow };
    } catch (err) {
      logger.error('[RequestsRepo] Exception extending hold', { requestId, err });
      return { ok: false, error: 'Failed to extend hold', code: '500' };
    }
  }

  /**
   * Check if user already has a pending request for the event
   */
  static async hasExistingRequest(eventId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('event_join_requests')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) {
        logger.warn('[RequestsRepo] Error checking existing request', { eventId, userId, error });
        return false;
      }

      return !!data;
    } catch (err) {
      logger.warn('[RequestsRepo] Exception checking existing request', { eventId, userId, err });
      return false;
    }
  }

  /**
   * Transform database row to API type (snake_case to camelCase)
   */
  private static transformRowToType(row: JoinRequestRow): JoinRequestType {
    return {
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      party_size: row.party_size,
      note: row.note,
      status: row.status as any,
      hold_expires_at: row.hold_expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// We'll need this stored procedure for atomic status updates
export const UPDATE_REQUEST_STATUS_PROCEDURE = `
CREATE OR REPLACE FUNCTION update_request_status(
  request_id uuid,
  new_status text,
  expected_status text DEFAULT NULL
)
RETURNS event_join_requests
LANGUAGE plpgsql
AS $$
DECLARE
  request_row event_join_requests;
  event_row events;
BEGIN
  -- Lock and get the request
  SELECT * INTO request_row
  FROM event_join_requests
  WHERE id = request_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found';
  END IF;
  
  -- Check expected status if provided
  IF expected_status IS NOT NULL AND request_row.status != expected_status THEN
    RAISE EXCEPTION 'Invalid status transition: expected %, got %', expected_status, request_row.status;
  END IF;
  
  -- For approvals, check capacity
  IF new_status = 'approved' AND request_row.status = 'pending' THEN
    -- Get current availability
    SELECT * FROM availability_for_event(request_row.event_id) INTO event_row;
    
    IF event_row.available < request_row.party_size THEN
      RAISE EXCEPTION 'Insufficient capacity: need %, have %', request_row.party_size, event_row.available;
    END IF;
    
    -- Create participant record
    INSERT INTO event_participants (event_id, user_id, status, party_size, joined_at)
    VALUES (request_row.event_id, request_row.user_id, 'accepted', request_row.party_size, now());
  END IF;
  
  -- Update the request
  UPDATE event_join_requests 
  SET status = new_status, updated_at = now()
  WHERE id = request_id
  RETURNING * INTO request_row;
  
  RETURN request_row;
END;
$$;
`
