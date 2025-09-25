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
  if (actorId && event.created_by !== actorId) {
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
  // Fallback implementation when RPC is unavailable
  // 1) Load event host/cohost status
  const { data: event, error: evErr } = await supabase
    .from('events')
    .select('id, created_by, status')
    .eq('id', eventId)
    .single();
  if (evErr) return { ...mapDbError(evErr) };
  if (!event) return { ok: false, error: 'NotFound', code: '404' };

  // Event must be editable
  if (!['draft', 'published'].includes((event as { status: string }).status)) {
    return { ok: false, error: 'Event not editable', code: '409' };
  }

  // Determine if actor is host or cohost
  let isHostOrCoHost = (event as { created_by: string }).created_by === actorId;
  if (!isHostOrCoHost) {
    const { data: parts, error: partErr } = await supabase
      .from('event_participants')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', actorId)
      .in('role', ['cohost']);
    if (partErr) return { ...mapDbError(partErr) };
    isHostOrCoHost = Array.isArray(parts) && parts.length > 0;
  }

  if (isHostOrCoHost) return { ok: true };

  // 2) Load current item assignment
  const { data: item, error: itemErr } = await supabase
    .from('event_items')
    .select('id, assigned_to')
    .eq('id', itemId)
    .eq('event_id', eventId)
    .single();
  if (itemErr) return { ...mapDbError(itemErr) };
  if (!item) return { ok: false, error: 'NotFound', code: '404' };

  const currentAssignee = (item as { assigned_to: string | null }).assigned_to;

  // Guest rules:
  // - Assign self only if item is unassigned
  // - Unassign only if currently assigned to self
  if (targetUserId === null) {
    // unassign
    if (currentAssignee !== actorId) {
      return { ok: false, error: 'Only current assignee may unassign', code: '403' };
    }
    return { ok: true };
  }

  // assigning to someone (or self)
  if (targetUserId !== actorId) {
    return { ok: false, error: 'Guests may only self-assign', code: '403' };
  }
  if (currentAssignee && currentAssignee !== actorId) {
    return { ok: false, error: 'Item already assigned', code: '409' };
  }
  return { ok: true };
}
