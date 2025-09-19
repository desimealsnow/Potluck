import { supabase } from '../config/supabaseClient';
import { components } from '../../../../libs/common/src/types.gen';
import {ServiceResult} from '../utils/helper';
import {sendInviteEmail } from '../utils/mailer';

type AddParticipantInput  = components['schemas']['ParticipantAdd'];
type UpdateParticipantInput  = components['schemas']['ParticipantUpdate'];
type Participant = components['schemas']['Participant'];

const UNIQUE_VIOLATION = '23505';

/* host auto-join - called inside createEvent service */
export async function addHost(eventId: string, hostId: string) {
  return supabase.from('event_participants').insert([
    { event_id: eventId, user_id: hostId, status: 'accepted' }
  ]);
}

export async function addParticipant(
  eventId: string,
  input: AddParticipantInput
): Promise<ServiceResult<Participant>> {
  // Default status to 'pending' if not provided
  const status = input.status ?? 'pending';

const { data, error } = await supabase
  .from('event_participants')
  .insert([{ event_id: eventId, user_id: input.user_id, status }])
  .select('*')
  .single();

  if (error) {
    // Handle conflict (duplicate RSVP/invite)
    if (error.code === UNIQUE_VIOLATION) {
      return {
        ok: false,
        error: 'Participant already invited',
        code: '409',
      };
    }

    // Generic DB error
    return {
      ok: false,
      error: error.message,
      code: '500',
    };
  }

  // Success
  return {
    ok: true,
    data: data!,
  };
}


/**
 * List all participants for an event.
 */
export async function listParticipants(
  eventId: string
): Promise<ServiceResult<Participant[]>> {
  const { data, error } = await supabase
    .from('event_participants')
    .select('id, user_id, status, joined_at, party_size')
    .eq('event_id', eventId)
    .order('joined_at', { ascending: true });

  if (error) {
    return {
      ok: false,
      error: error.message,
      code: '500',
    };
  }

  return {
    ok: true,
    data: data!,
  };
}



/**
 * Update a participant’s RSVP/status.
 */
export async function updateParticipant(
  partId: string,
  input: UpdateParticipantInput
): Promise<ServiceResult<Participant>> {
  // 1) Fetch current participant to know event and user
  const { data: current, error: fetchErr } = await supabase
    .from('event_participants')
    .select('id, event_id, user_id, status')
    .eq('id', partId)
    .maybeSingle();

  if (fetchErr) {
    return { ok: false, error: fetchErr.message, code: '500' };
  }
  if (!current) {
    return { ok: false, error: 'Participant not found', code: '404' };
  }

  // 2) Update the status
  const { data, error } = await supabase
    .from('event_participants')
    .update({ status: input.status })
    .eq('id', partId)
    .select('*')
    .maybeSingle();    // returns null if no row matches

  // Database error
  if (error) {
    return {
      ok: false,
      error: error.message,
      code: '500',
    };
  }

  // No participant found with that ID
  if (!data) {
    return {
      ok: false,
      error: 'Participant not found',
      code: '404',
    };
  }

  // 3) If they dropped from accepted → (maybe|declined), unassign their items
  const dropped = current.status === 'accepted' && (input.status === 'maybe' || input.status === 'declined');
  if (dropped) {
    const eventId = (current as any).event_id as string;
    const userId  = (current as any).user_id as string;

    // Unassign all items assigned_to this user for the event
    const { data: affectedItems, error: listErr } = await supabase
      .from('event_items')
      .select('id')
      .eq('event_id', eventId)
      .eq('assigned_to', userId);

    if (!listErr && affectedItems && affectedItems.length) {
      const ids = affectedItems.map(r => r.id);
      const { error: unassignErr } = await supabase
        .from('event_items')
        .update({ assigned_to: null })
        .in('id', ids);

      // Best-effort notifications for each unclaimed item
      if (!unassignErr) {
        try {
          const { createNotification } = await import('../services/notifications.service');
          for (const item of affectedItems) {
            await createNotification({
              userId,
              type: 'item_unclaimed',
              eventId,
              itemId: item.id,
            });
          }
        } catch {}
      }
    }
  }

  // Success
  return {
    ok: true,
    data,
  };
}



/**
 * Remove (kick/leave) a participant by ID.
 */
export async function deleteParticipant(
  partId: string
): Promise<ServiceResult<null>> {
  // Attempt deletion and fetch the deleted row (if any)
  const { data, error } = await supabase
    .from('event_participants')
    .delete()
    .eq('id', partId)
    .select('*')
    .maybeSingle();

  // DB error
  if (error) {
    return {
      ok: false,
      error: error.message,
      code: '500',
    };
  }

  // No row matched → not found
  if (!data) {
    return {
      ok: false,
      error: 'Participant not found',
      code: '404',
    };
  }

  // Success (we don't need to return the deleted record)
  return {
    ok: true,
    data: null,
  };
}




/**
 * Fetch a single participant by eventId and partId.
 */
export async function getParticipant(
  eventId: string,
  partId: string
): Promise<ServiceResult<Participant>> {
  // Query with maybeSingle to avoid throwing on no rows
  const { data, error } = await supabase
    .from('event_participants')
    .select('id, user_id, status, joined_at, event_id, party_size')
    .eq('event_id', eventId)
    .eq('id', partId)
    .maybeSingle();

  if (error) {
    // DB-level failure
    return {
      ok: false,
      error: error.message,
      code: '500',
    };
  }

  if (!data) {
    // No matching row
    return {
      ok: false,
      error: 'Participant not found',
      code: '404',
    };
  }

  // Success
  return {
    ok: true,
    data,
  };
}



/**
 * Bulk-invite participants to an event.
 */
export async function bulkAddParticipants(
  eventId: string,
  inputs: AddParticipantInput[]
): Promise<ServiceResult<Participant[]>> {
  // Shortcut: nothing to do
  if (inputs.length === 0) {
    return { ok: true, data: [] };
  }

  // Prepare rows
  const rows = inputs.map(input => ({
    event_id: eventId,
    user_id:  input.user_id,
    status:   input.status ?? 'pending',
  }));

  // Insert all at once
  const { data, error } = await supabase
    .from('event_participants')
    .insert(rows)
    .select('*');  

  if (error) {
    // One or more duplicates → 409 Conflict
    if (error.code === UNIQUE_VIOLATION) {
      return {
        ok:    false,
        error: 'One or more participants already invited',
        code:  '409',
      };
    }
    // Other DB issues → 500
    return {
      ok:    false,
      error: error.message,
      code:  '500',
    };
  }

  // Success: return the array of created participants
  return {
    ok:   true,
    data: data!,
  };
}

/**
 * Re-send an invite email to a participant.
 */
export async function resendInvite(
  partId: string
): Promise<ServiceResult<null>> {
  // 1) Fetch the participant row
  const { data: participant, error: pError } = await supabase
    .from('event_participants')
    .select('id, user_id, event_id')
    .eq('id', partId)
    .maybeSingle();

  if (pError) {
    return { ok: false, error: pError.message, code: '500' };
  }
  if (!participant) {
    return { ok: false, error: 'Participant not found', code: '404' };
  }

  // 2) Get the user’s email/name
  const { data: user, error: uError } = await supabase
    .from('users')
    .select('email, name')
    .eq('id', participant.user_id)
    .single();

  if (uError) {
    return { ok: false, error: uError.message, code: '500' };
  }

  // 3) (Optional) Grab event details for the email
  const { data: event, error: eError } = await supabase
    .from('events')
    .select('id, name, starts_at')
    .eq('id', participant.event_id)
    .single();

  if (eError) {
    return { ok: false, error: eError.message, code: '500' };
  }

  // 4) Send the invite email
  try {
    await sendInviteEmail(user.email, {
      participantName: user.name,
      eventName:       event.name,
      eventDate:       event.starts_at,
    });
    return { ok: true, data: null };
  } catch (mailErr) {
    return {
      ok:    false,
      error: (mailErr as Error).message,
      code:  '500',
    };
  }
}
