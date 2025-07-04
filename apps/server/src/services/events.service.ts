import { supabase } from '../config/supabaseClient';
import { addHost } from '../services/participants.service';
import { resolveLocation } from './locations.service';
import debug from 'debug';
import logger from '../logger';
import {ServiceResult,mapDbError, ServiceError,toDbColumns} from "../utils/helper";
import { schemas }  from '../validators';           // <- generated Zod objects

import { components } from '../../../../libs/common/src/types.gen';
type CreateEventInput  = components['schemas']['EventCreate'];
type ItemCreateInput   = components['schemas']['ItemCreate'];
type EventFull = components['schemas']['EventFull'];
type EventSummary = components['schemas']['EventSummary'];
type EventWithItems     = components['schemas']['EventWithItems'];
type EventUpdateInput = components['schemas']['EventUpdate'];
type EventCancelInput = components['schemas']['EventCancel'];

const log = debug('potluck:events'); 
logger.info('Debug namespace is Event Service');

/**
 * Atomically create an Event (status = draft), auto‑RSVP the host, and insert
 * the initial item slots in one Postgres transaction. All input validation is
 * performed via the generated Zod schema before touching the DB.
 *
 * ⚠️  Requires a Postgres function `create_event_with_items(_actor_id uuid, _payload jsonb)`
 *     that performs the inserts under `SECURITY DEFINER` so it can run inside
 *     an RLS context.  See migrations/20250630_create_event_with_items.sql.
 */
export async function createEventWithItems(
  input: CreateEventInput,
  userId: string
): Promise<ServiceResult<EventWithItems>> {
  // 1️⃣  Validate payload (throws if invalid)
  const parsed = schemas.EventCreate.parse(input);

  // 2️⃣  Call the transactionally‑safe Postgres function. We send the entire
  //     payload so the function can resolve / insert location, event, host
  //     participant, and item rows under one BEGIN/COMMIT.
  const { data, error } = await supabase.rpc(
    'create_event_with_items',
    {
      _actor_id: userId,
      _payload: parsed            // postgres function expects jsonb argument
    }
  );

  if (error || !data) return mapDbError(error);

  // 3️⃣  Function already returns the composed EventWithItems object that
  //     matches the OpenAPI schema, so we can surface it directly.
  return { ok:true, data: data as EventWithItems };
}

/* ─────────────────────────────────────────────
   Utility: assign / unassign an item to a user
   (used by the /assign and /unassign endpoints)
───────────────────────────────────────────────*/
export async function assignItem(itemId: string, userId: string | null) {
  return supabase
    .from('event_items')
    .update({ assigned_to: userId })
    .eq('id', itemId)
    .select()
    .single();
}

export async function getEventDetails(
  eventId: string,
  userId: string // authGuard gives us this
): Promise<ServiceResult<EventFull>> {
  logger.info('[EventService] getEventDetails start:', { eventId, userId });

  // Pull event + location + items + participants
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, created_by, title, description, event_date, min_guests, max_guests,
      meal_type, attendee_count,
      location:locations(place_id, name, formatted_address, latitude, longitude),
      items:event_items(id, name, category, per_guest_qty, required_qty,
                        unit, assigned_to),
      participants:event_participants(
        id, user_id, status, joined_at
      )
    `)
    .eq('id', eventId)
    .single();

  if (error || !data) {
    logger.warn('[EventService] Event not found', { eventId });
    return { ok: false, error: 'Event not found', code: '404' };
  }

  // Assemble result to match the OpenAPI schema
  const response: EventFull = {
    event: {
      id: data.id,
      title: data.title,
      description: data.description,
      event_date: data.event_date,
      min_guests: data.min_guests,
      max_guests: data.max_guests,
      meal_type: data.meal_type,
      attendee_count: data.attendee_count,
      created_by: data.created_by,
      location: Array.isArray(data.location) ? data.location[0] : data.location,
      items: data.items ?? []
    },
    items: data.items ?? [],
    participants: data.participants ?? []
  };

  logger.info('[EventService] getEventDetails success', { eventId });
  return { ok: true, data: response };
}



interface ListEventsParams {
  limit?: number;
  offset?: number;
  status?: string;
  startsAfter?: string;
  startsBefore?: string;
}

interface PaginatedEventSummary {
  items: EventSummary[];
  totalCount: number;
  nextOffset: number | null;
}

export async function listEvents(
  userId: string,
  {
    limit = 20,
    offset = 0,
    status,
    startsAfter,
    startsBefore
  }: ListEventsParams
): Promise<ServiceResult<PaginatedEventSummary>> {
  logger.info('[EventService] listEvents', { userId, limit, offset, status, startsAfter, startsBefore });

  // Step 1: Find all event_ids where the user is a participant (including host)
  const { data: partRows, error: partErr } = await supabase
    .from('event_participants')
    .select('event_id')
    .eq('user_id', userId);

  if (partErr) {
    logger.error('Error fetching participant events', partErr);
    return { ok: false, error: partErr.message, code: '500' };
  }
  const participantIds = partRows?.map(r => r.event_id) ?? [];

  // Step 2: Build the query for events where the user is host or participant
  let query = supabase
    .from('events')
    .select('id, title, event_date, attendee_count, meal_type, status')
    .order('event_date', { ascending: false });

  // Step 3: Host or participant filter
  if (participantIds.length) {
    query = query.or(
      `created_by.eq.${userId},id.in.(${participantIds.join(',')})`
    );
  } else {
    query = query.eq('created_by', userId);
  }

  // Step 4: Apply filters
  if (status) {
    query = query.eq('status', status);
  }
  if (startsAfter) {
    query = query.gte('event_date', startsAfter);
  }
  if (startsBefore) {
    query = query.lte('event_date', startsBefore);
  }

  // Step 5: Get total count for pagination
  // For count (no pagination)
  let countQuery = supabase
    .from('events')
    .select('id', { count: 'exact', head: true }); // only need IDs for count
  countQuery = applyEventFilters(countQuery, { userId, participantIds, status, startsAfter, startsBefore });
  const { count, error: countErr } = await countQuery;
  if (countErr) {
    logger.error('Error fetching event count', countErr);
    return { ok: false, error: countErr.message, code: '500' };
  }
  // For data (with pagination)
  let dataQuery = supabase
  .from('events')
  .select('id, title, event_date, attendee_count, meal_type, status')
  .order('event_date', { ascending: false });
  dataQuery = applyEventFilters(dataQuery, { userId, participantIds, status, startsAfter, startsBefore });

  const { data: events, error: evErr } = await dataQuery.range(
  offset,
  offset + limit - 1
  );

  if (evErr) {
    logger.error('Error fetching events', evErr);
    return { ok: false, error: evErr.message, code: '500' };
  }

  const items = (events ?? []) as EventSummary[];
  const totalCount = count ?? items.length;
  const nextOffset = offset + limit < totalCount ? offset + limit : null;

  return {
    ok: true,
    data: {
      items,
      totalCount,
      nextOffset
    }
  };
}

function applyEventFilters(
  builder: any,
  {
    userId,
    participantIds,
    status,
    startsAfter,
    startsBefore
  }: {
    userId: string,
    participantIds: string[],
    status?: string,
    startsAfter?: string,
    startsBefore?: string
  }
) {
  if (participantIds.length) {
    builder = builder.or(
      `created_by.eq.${userId},id.in.(${participantIds.join(',')})`
    );
  } else {
    builder = builder.eq('created_by', userId);
  }
  if (status) builder = builder.eq('status', status);
  if (startsAfter) builder = builder.gte('event_date', startsAfter);
  if (startsBefore) builder = builder.lte('event_date', startsBefore);
  return builder;
}


// Helper: Checks if event can be edited
async function ensureEventEditable(eventId: string, actorId: string): Promise<ServiceResult<{ event: any }>> {
  // Fetch event for permission and state checks
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !data) return { ok: false, error: 'Event not found', code: '404' };

  // Only host can update event
  if (data.created_by !== actorId) return { ok: false, error: 'Forbidden', code: '403' };

  // Cannot edit cancelled or completed event
  if (['cancelled', 'completed'].includes(data.status)) {
    return { ok: false, error: `Cannot update an event with status ${data.status}`, code: '409' };
  }

  return { ok: true, data: { event: data } };
}

export async function updateEventDetails(
  eventId: string,
  actorId: string,
  payload: EventUpdateInput
): Promise<ServiceResult<EventFull>> {
  logger.info('[EventService] updateEventDetails', { eventId, actorId, payload });

  // 1. Check permission and event state
  const editableCheck = await ensureEventEditable(eventId, actorId);
  if (!editableCheck.ok) return editableCheck;

  // 2. Only allow updatable fields and convert camelCase to snake_case
  const editableKeys = [
    'title',
    'description',
    'event_date',
    'min_guests',
    'max_guests',
    'meal_type',
    'location'
  ] as const;
  const dbPayload = toDbColumns(payload, editableKeys);

  if (Object.keys(dbPayload).length === 0) {
    return { ok: false, error: 'No valid fields to update', code: '400' };
  }

  // 3. Special: handle location object separately if present
  if ('location' in dbPayload && dbPayload.location) {
    // You may want to resolve location or insert as needed here
    // For now, assume it's already a location_id
    dbPayload['location_id'] = dbPayload.location;
    delete dbPayload.location;
  }

  // 4. Update event in DB
  const { data, error } = await supabase
    .from('events')
    .update(dbPayload)
    .eq('id', eventId)
    .select()
    .single();

  if (error || !data) {
    logger.error('Event update failed', error);
    return { ok: false, error: error?.message || 'Update failed', code: '500' };
  }

  // 5. Fetch latest event with items and participants
  // (reuse your existing getEventDetails for this step)
  const fullEvent = await getEventDetails(eventId, actorId);
  if (!fullEvent.ok) {
    logger.warn('Event updated, but unable to fetch full details', { eventId });
    return { ok: true, data: null as any }; // Optionally return the partial event data
  }

  return { ok: true, data: fullEvent.data };
}



/**
 * Publishes a draft event, transitioning it to 'published' status.
 * Only the host can publish. Only draft events can be published.
 */
export async function publishEvent(
  eventId: string,
  actorId: string
): Promise<ServiceResult<EventFull>> {
  logger.info('[EventService] publishEvent', { eventId, actorId });

  // 1️⃣ Fetch the event for checks
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    logger.warn('[EventService] Event not found', { eventId });
    return { ok: false, error: 'Event not found', code: '404' };
  }

  // 2️⃣ Only host can publish
  if (event.created_by !== actorId) {
    return { ok: false, error: 'Forbidden – only host can publish', code: '403' };
  }

  // 3️⃣ Only drafts can be published
  if (event.status !== 'draft') {
    return {
      ok: false,
      error: `Only draft events can be published (current status: ${event.status})`,
      code: '409',
    };
  }

  // 4️⃣ Transition to 'published'
  const { data: updated, error: updateErr } = await supabase
    .from('events')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();

  if (updateErr || !updated) {
    logger.error('[EventService] Failed to publish event', { eventId, updateErr });
    return { ok: false, error: updateErr?.message ?? 'Failed to publish event', code: '500' };
  }

  // 5️⃣ Return full event details (use your existing getEventDetails)
  const result = await getEventDetails(eventId, actorId);
  if (!result.ok) return result;

  return { ok: true, data: result.data };
}


/**
 * Cancels a published event (status: published → cancelled).
 * Only the host can cancel. Must provide a reason. Optionally notify guests.
 */
export async function cancelEvent(
  eventId: string,
  actorId: string,
  payload: EventCancelInput
): Promise<ServiceResult<EventFull>> {
  logger.info('[EventService] cancelEvent', { eventId, actorId, payload });

  // 1️⃣ Fetch the event for checks
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    logger.warn('[EventService] Event not found', { eventId });
    return { ok: false, error: 'Event not found', code: '404' };
  }

  // 2️⃣ Only host can cancel
  if (event.created_by !== actorId) {
    return { ok: false, error: 'Forbidden – only host can cancel', code: '403' };
  }

  // 3️⃣ Only published events can be cancelled (business logic)
  if (event.status !== 'published') {
    return {
      ok: false,
      error: `Only published events can be cancelled (current status: ${event.status})`,
      code: '409',
    };
  }

  // 4️⃣ Must provide a reason
  if (!payload.reason?.trim()) {
    return { ok: false, error: 'Cancel reason is required', code: '400' };
  }

  // 5️⃣ Transition to 'cancelled' with reason and timestamp
  const { data: updated, error: updateErr } = await supabase
    .from('events')
    .update({
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancel_reason: payload.reason,
    })
    .eq('id', eventId)
    .select()
    .single();

  if (updateErr || !updated) {
    logger.error('[EventService] Failed to cancel event', { eventId, updateErr });
    return { ok: false, error: updateErr?.message ?? 'Failed to cancel event', code: '500' };
  }

  // 6️⃣ Optionally notify guests (stub, can expand later)
  if (payload.notifyGuests) {
    // sendCancellationNotifications(eventId, payload.reason); // implement as needed
    logger.info('[EventService] Guests would be notified (not implemented).');
  }

  // 7️⃣ Return full event details
  const result = await getEventDetails(eventId, actorId);
  if (!result.ok) return result;

  return { ok: true, data: result.data };
}


/**
 * Marks a published event as completed (status: published → completed).
 * Only the host can complete. Only published events can be completed.
 */
export async function completeEvent(
  eventId: string,
  actorId: string
): Promise<ServiceResult<EventFull>> {
  logger.info('[EventService] completeEvent', { eventId, actorId });

  // 1️⃣ Fetch the event for checks
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    logger.warn('[EventService] Event not found', { eventId });
    return { ok: false, error: 'Event not found', code: '404' };
  }

  // 2️⃣ Only host can complete
  if (event.created_by !== actorId) {
    return { ok: false, error: 'Forbidden – only host can complete', code: '403' };
  }

  // 3️⃣ Only published events can be completed (business logic)
  if (event.status !== 'published') {
    return {
      ok: false,
      error: `Only published events can be completed (current status: ${event.status})`,
      code: '409',
    };
  }

  // 4️⃣ Transition to 'completed' with timestamp
  const { data: updated, error: updateErr } = await supabase
    .from('events')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('id', eventId)
    .select()
    .single();

  if (updateErr || !updated) {
    logger.error('[EventService] Failed to complete event', { eventId, updateErr });
    return { ok: false, error: updateErr?.message ?? 'Failed to complete event', code: '500' };
  }

  // 5️⃣ Return full event details
  const result = await getEventDetails(eventId, actorId);
  if (!result.ok) return result;

  return { ok: true, data: result.data };
}

/**
 * Deletes an event (allowed only if draft; hard-delete).
 * Only the host can delete.
 */
export async function deleteEvent(
  eventId: string,
  actorId: string
): Promise<ServiceResult<null>> {
  logger.info('[EventService] deleteEvent', { eventId, actorId });

  // 1️⃣ Fetch the event for permission and status checks
  const { data: event, error } = await supabase
    .from('events')
    .select('id, created_by, status')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    logger.warn('[EventService] Event not found', { eventId });
    return { ok: false, error: 'Event not found', code: '404' };
  }

  // 2️⃣ Only host can delete
  if (event.created_by !== actorId) {
    return { ok: false, error: 'Forbidden – only host can delete', code: '403' };
  }

  // 3️⃣ Only allow hard delete if status is draft
  if (event.status !== 'draft') {
    return {
      ok: false,
      error: `Only draft events can be deleted (current status: ${event.status})`,
      code: '409'
    };
  }

  // 4️⃣ Delete the event
  const { error: delErr } = await supabase
    .from('events')
    .delete()
    .eq('id', eventId);

  if (delErr) {
    logger.error('[EventService] Failed to delete event', { eventId, delErr });
    return { ok: false, error: delErr.message || 'Delete failed', code: '500' };
  }

  logger.info('[EventService] Event deleted', { eventId });
  return { ok: true, data: null };
}


/**
 * Soft-deletes (purges) an event (allowed only if draft or cancelled).
 * Only the host can purge. Event is not removed from DB but is no longer visible to users.
 * Recommended: add a 'purged' status or 'deleted_at' field to the events table.
 */
export async function purgeEvent(
  eventId: string,
  actorId: string
): Promise<ServiceResult<null>> {
  logger.info('[EventService] purgeEvent', { eventId, actorId });

  // 1️⃣ Fetch the event for permission and status checks
  const { data: event, error } = await supabase
    .from('events')
    .select('id, created_by, status')
    .eq('id', eventId)
    .single();

  if (error || !event) {
    logger.warn('[EventService] Event not found', { eventId });
    return { ok: false, error: 'Event not found', code: '404' };
  }

  // 2️⃣ Only host can purge
  if (event.created_by !== actorId) {
    return { ok: false, error: 'Forbidden – only host can purge', code: '403' };
  }

  // 3️⃣ Only allow soft-delete if event is draft or cancelled (business rule)
  if (!['draft', 'cancelled'].includes(event.status)) {
    return {
      ok: false,
      error: `Only draft or cancelled events can be purged (current status: ${event.status})`,
      code: '409'
    };
  }

  // 4️⃣ Soft-delete (mark as purged; optionally add deleted_at timestamp)
  const { error: updateErr } = await supabase
    .from('events')
    .update({
      status: 'purged',
      deleted_at: new Date().toISOString()   // assuming you have this field!
    })
    .eq('id', eventId);

  if (updateErr) {
    logger.error('[EventService] Failed to purge event', { eventId, updateErr });
    return { ok: false, error: updateErr.message || 'Purge failed', code: '500' };
  }

  logger.info('[EventService] Event purged (soft deleted)', { eventId });
  return { ok: true, data: null };
}


export async function restoreEvent(
  eventId: string,
  actorId: string
): Promise<ServiceResult<EventFull>> {
  // 1. Fetch the event
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single();

  if (error || !event) return { ok: false, error: 'Event not found', code: '404' };

  // 2. Only the host can restore
  if (event.created_by !== actorId) {
    return { ok: false, error: 'Forbidden – only host can restore', code: '403' };
  }

  // 3. Only purged events can be restored
  if (event.status !== 'purged') {
    return { ok: false, error: 'Only purged events can be restored', code: '409' };
  }

  // 4. Restore status (to 'draft' or another safe value), clear deleted_at
  const { data: updated, error: updateErr } = await supabase
    .from('events')
    .update({
      status: 'draft',
      deleted_at: null
    })
    .eq('id', eventId)
    .select()
    .single();

  if (updateErr || !updated) {
    return { ok: false, error: updateErr?.message ?? 'Failed to restore event', code: '500' };
  }

  // 5. Return full event details
  const result = await getEventDetails(eventId, actorId);
  if (!result.ok) return result;

  return { ok: true, data: result.data };
}
