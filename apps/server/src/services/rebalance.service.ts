import { supabase } from '../config/supabaseClient';
import logger from '../logger';
import { ServiceResult } from '../utils/helper';

type RebalanceOptions = { maxPerUser?: number };

export async function rebalanceUnassigned(
  eventId: string,
  actorId: string,
  opts: RebalanceOptions = {}
): Promise<ServiceResult<{ assigned: number }>> {
  try {
    // Ensure actor is host/cohost
    const { data: eventRow, error: evErr } = await supabase
      .from('events')
      .select('id, created_by')
      .eq('id', eventId)
      .single();
    if (evErr || !eventRow) return { ok: false, error: 'Event not found', code: '404' };
    let isHost = eventRow.created_by === actorId;
    if (!isHost) {
      const { data: roleRows, error: roleErr } = await supabase
        .from('event_participants')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', actorId)
        .in('role', ['cohost']);
      if (roleErr) return { ok: false, error: roleErr.message, code: '500' };
      isHost = Array.isArray(roleRows) && roleRows.length > 0;
    }
    if (!isHost) return { ok: false, error: 'Forbidden', code: '403' };

    // Find unassigned items
    const { data: unassigned, error: itemsErr } = await supabase
      .from('event_items')
      .select('id')
      .eq('event_id', eventId)
      .is('assigned_to', null);
    if (itemsErr) return { ok: false, error: itemsErr.message, code: '500' };
    const items = unassigned || [];
    if (!items.length) return { ok: true, data: { assigned: 0 } };

    // Get accepted participants and current load
    const { data: accepted, error: accErr } = await supabase
      .from('event_participants')
      .select('user_id')
      .eq('event_id', eventId)
      .eq('status', 'accepted');
    if (accErr) return { ok: false, error: accErr.message, code: '500' };
    const participants = (accepted || []).map(r => r.user_id);
    if (!participants.length) return { ok: true, data: { assigned: 0 } };

    // Build load map
    const { data: assignedNow, error: loadErr } = await supabase
      .from('event_items')
      .select('assigned_to')
      .eq('event_id', eventId)
      .not('assigned_to', 'is', null);
    if (loadErr) return { ok: false, error: loadErr.message, code: '500' };
    const load = new Map<string, number>();
    for (const uid of participants) load.set(uid, 0);
    for (const row of assignedNow || []) {
      if (row.assigned_to) load.set(row.assigned_to, (load.get(row.assigned_to) || 0) + 1);
    }

    const maxPerUser = opts.maxPerUser ?? 2;
    let assignedCount = 0;
    // Round-robin assign
    for (const itm of items) {
      // pick the participant with least load under maxPerUser
      const candidates = participants
        .filter(uid => (load.get(uid) || 0) < maxPerUser)
        .sort((a, b) => (load.get(a)! - load.get(b)!));
      if (!candidates.length) break;
      const target = candidates[0];
      const { error: updErr } = await supabase
        .from('event_items')
        .update({ assigned_to: target })
        .eq('id', itm.id)
        .eq('event_id', eventId);
      if (!updErr) {
        load.set(target, (load.get(target) || 0) + 1);
        assignedCount++;
      }
    }

    logger.info('[Rebalance] Assigned items', { eventId, assignedCount });
    return { ok: true, data: { assigned: assignedCount } };
  } catch (err) {
    return { ok: false, error: 'Failed to rebalance', code: '500' };
  }
}

