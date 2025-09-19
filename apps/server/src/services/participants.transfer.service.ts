import { supabase } from '../config/supabaseClient';
import { ServiceResult } from '../utils/helper';

type Options = { newUserId: string; carryItems?: boolean };

export async function transferParticipant(
  eventId: string,
  partId: string,
  actorId: string,
  { newUserId, carryItems = false }: Options
): Promise<ServiceResult<{ old_participant_id: string; new_participant_id: string }>> {
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

  // Load old participant
  const { data: oldPart, error: oldErr } = await supabase
    .from('event_participants')
    .select('id, user_id, status, party_size')
    .eq('id', partId)
    .eq('event_id', eventId)
    .single();
  if (oldErr || !oldPart) return { ok: false, error: 'Participant not found', code: '404' };

  // Create or upsert the new participant as pending with same party_size
  const { data: newPart, error: insErr } = await supabase
    .from('event_participants')
    .insert({ event_id: eventId, user_id: newUserId, status: oldPart.status, party_size: oldPart.party_size })
    .select('id')
    .single();
  if (insErr) return { ok: false, error: insErr.message, code: '500' };

  // Transfer or release items
  if (carryItems) {
    await supabase
      .from('event_items')
      .update({ assigned_to: newUserId })
      .eq('event_id', eventId)
      .eq('assigned_to', oldPart.user_id);
  } else {
    await supabase
      .from('event_items')
      .update({ assigned_to: null })
      .eq('event_id', eventId)
      .eq('assigned_to', oldPart.user_id);
  }

  // Mark old participant as declined (audit kept)
  await supabase
    .from('event_participants')
    .update({ status: 'declined' })
    .eq('id', partId);

  return { ok: true, data: { old_participant_id: partId, new_participant_id: newPart!.id } };
}

