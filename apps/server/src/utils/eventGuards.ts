import { supabase } from '../config/supabaseClient';
import { components } from '../../../../libs/common/src/types.gen';
import {mapDbError} from './helper';
export type ErrorCode = '400' | '401' | '403' | '404' | '409' | '500';

// Re‑use the schema‑driven types generated from OpenAPI / codegen
// ----------------------------------------------------------------------------
type EventFull   = components['schemas']['EventFull'];

export type GuardResult<T = undefined> =
  | { ok: true;  data?: T }
  | { ok: false; error: string; code?: ErrorCode };



/**
 * Verify that an event exists, is in an editable state
 * (draft or published), and—if `actorId` is supplied—
 * that the actor is host or co-host.
 */
export async function ensureEventEditable(
  eventId: string,
  actorId?: string          // ← NEW, optional
): Promise<GuardResult<EventFull>> {
  // 1️⃣ fetch the event
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error)              return {  ...mapDbError(error) };
  if (!event)             return { ok: false, error: 'NotFound', code: '404' };

  // 2️⃣ status must be editable
  if (!['draft', 'published'].includes(event.status)) {
    return { ok: false, error: 'Event not editable', code: '409' };
  }

  // 3️⃣ permission check (optional)
  if (actorId && event.host_id !== actorId) {
    const { data: rows, error: partErr } = await supabase
      .from('event_participants')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', actorId)
      .in('role', ['cohost']);

    if (partErr)          return {  ...mapDbError(partErr) };
    if (!rows?.length)    return { ok: false, error: 'Forbidden', code: '403' };
  }

  return { ok: true, data: event as EventFull };
}
/**
 * Guard that the actor (caller) is permitted to assign/unassign the item.
 * Rules:
 *   • Host or co‑host can assign/unassign any item.
 *   • A guest can assign an *unassigned* item to **themselves**.
 *   • A guest can unassign **only** if they are the current assignee.
 */
export async function ensureActorCanAssign(
  eventId: string,
  itemId: string,
  actorId: string,
  targetUserId: string | null  // null means unassign
): Promise<GuardResult> {
  // 1. Fetch actor role & item current assignee in a single query
  const { data, error } = await supabase
    .rpc('actor_can_assign_check', {
      _event_id:   eventId,
      _item_id:    itemId,
      _actor_id:   actorId,
      _target_uid: targetUserId
    });

  /*
     The Postgres helper function returns:
       { allowed: boolean, reason: text }
     but Supabase can coerce it into a JSON object. We use this tiny RPC so we
     don\'t ship 3 round‑trips (fetch participant role, fetch item, check).
  */
  if (error) return mapDbError(error);
  if (!data)  return {ok: false, error: 'Permission check failed', code: '500' };

  if (!data.allowed) {
    return { ok: false,error: data.reason || 'Not allowed', code: '403' };
  }
  return { ok: true };
}
