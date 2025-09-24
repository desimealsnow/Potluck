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

      if (!error && data && data.length) {
        return { ok: true, data: data[0] as AvailabilityRow };
      }

      // Fallback to direct queries if RPC is missing or errored
      if (error) {
        logger.warn('[RequestsRepo] RPC availability_for_event failed, using fallback', { eventId, error });
      }
      const fb = await fallbackAvailability(eventId);
      if (!fb) return { ok: false, error: 'Event not found', code: '404' };
      return { ok: true, data: fb };
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

      if (!error && data) {
        return { ok: true, data: data as JoinRequestRow };
      }

      // Fallback path when RPC not available
      logger.warn('[RequestsRepo] RPC process_join_request failed, using fallback', { eventId, userId, error });

      const fb = await fallbackAvailability(eventId);
      if (!fb) return { ok: false, error: 'Event not found', code: '404' };
      if ((fb.available ?? 0) < partySize) {
        return { ok: false, error: `Insufficient capacity: need ${partySize}, have ${fb.available}`, code: '409' };
      }

      const holdExpiry = new Date(Date.now() + holdTtlMinutes * 60 * 1000).toISOString();
      const insert = await supabase
        .from('event_join_requests')
        .insert({
          event_id: eventId,
          user_id: userId,
          party_size: partySize,
          note: note || null,
          status: 'pending',
          hold_expires_at: holdExpiry,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (insert.error || !insert.data) return mapDbError(insert.error);
      return { ok: true, data: insert.data as JoinRequestRow };
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
      // Use a transaction-like RPC first
      const { data, error } = await supabase.rpc('update_request_status', {
        request_id: requestId,
        new_status: newStatus,
        expected_status: expectedCurrentStatus || null,
      });

      if (!error && data) {
        return { ok: true, data: data as JoinRequestRow };
      }

      // Fallback: emulate the transition using direct queries
      logger.warn('[RequestsRepo] RPC update_request_status failed, using fallback', { requestId, newStatus, error });

      // Load existing request
      const current = await supabase
        .from('event_join_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      if (current.error || !current.data) return mapDbError(current.error);

      const row = current.data as JoinRequestRow;
      if (expectedCurrentStatus && row.status !== expectedCurrentStatus) {
        return { ok: false, error: 'Invalid status transition', code: '409' };
      }

      // For approval, verify capacity and create participant row
      if (newStatus === 'approved') {
        const fb = await fallbackAvailability(row.event_id);
        if (!fb) return { ok: false, error: 'Event not found', code: '404' };
        if ((fb.available ?? 0) < row.party_size) {
          return { ok: false, error: 'Insufficient capacity', code: '409' };
        }
        // Create participant
        const insPart = await supabase
          .from('event_participants')
          .insert({
            event_id: row.event_id,
            user_id: row.user_id,
            status: 'accepted',
            party_size: row.party_size,
            joined_at: new Date().toISOString(),
          })
          .select('id')
          .single();
        if (insPart.error) return mapDbError(insPart.error);
      }

      // Update request status
      const upd = await supabase
        .from('event_join_requests')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', requestId)
        .select('*')
        .single();
      if (upd.error || !upd.data) return mapDbError(upd.error);
      return { ok: true, data: upd.data as JoinRequestRow };
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
      status: row.status as unknown as JoinRequestType['status'],
      hold_expires_at: row.hold_expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

// Fallback availability computation using direct tables
async function fallbackAvailability(eventId: string): Promise<AvailabilityRow | null> {
  // Get event capacity_total
  const ev = await supabase
    .from('events')
    .select('capacity_total')
    .eq('id', eventId)
    .maybeSingle();
  if (ev.error) return null;
  if (!ev.data) return null;
  const total = (ev.data as { capacity_total?: number } | null)?.capacity_total ?? 0;

  // Sum confirmed party sizes from participants
  const acc = await supabase
    .from('event_participants')
    .select('party_size')
    .eq('event_id', eventId)
    .eq('status', 'accepted');
  const confirmed = (acc.data || []).reduce((s: number, r: { party_size?: number | null }) => s + (r.party_size || 0), 0);

  // Sum held party sizes from pending requests with non-expired hold
  const nowIso = new Date().toISOString();
  const holds = await supabase
    .from('event_join_requests')
    .select('party_size, hold_expires_at, status')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .gt('hold_expires_at', nowIso);
  const held = (holds.data || []).reduce((s: number, r: { party_size?: number | null }) => s + (r.party_size || 0), 0);

  const available = Math.max(0, Number(total) - Number(confirmed) - Number(held));
  return { total: Number(total), confirmed, held, available } as AvailabilityRow;
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
