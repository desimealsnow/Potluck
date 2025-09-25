import { supabase } from '../config/supabaseClient';
import { components } from '../../../../libs/common/src/types.gen';
import logger from '../logger';
import { z } from 'zod';
import { schemas }  from '../validators';           // <- generated Zod objects
import {ServiceResult, toDbColumns, mapDbError } from '../utils/helper';
import {ensureEventEditable,ensureActorCanAssign} from '../utils/eventGuards';
type ItemCreate  = components['schemas']['ItemCreate'];
// type ItemUpdate   = components['schemas']['ItemUpdate'];
type Item  = components['schemas']['Item'];


// const ALLOWED_UPDATE_FIELDS = ['name', 'category', 'perGuestQty'] as const;
/** create a new item slot */
export async function addItem(
  eventId: string,
  input: ItemCreate,
  userId: string
): Promise<ServiceResult<components['schemas']['Item']>> {
  logger.info(`addItem: start`, { eventId, userId, input });
  const payload: Record<string, unknown> = { ...input, event_id: eventId, created_by: userId };
  // Map optional source IDs to columns (if provided)
  if ((input as unknown as { catalog_item_id?: string }).catalog_item_id) payload.catalog_item_id = (input as unknown as { catalog_item_id?: string }).catalog_item_id;
  if ((input as unknown as { user_item_id?: string }).user_item_id) payload.user_item_id = (input as unknown as { user_item_id?: string }).user_item_id;

  const { data, error } = await supabase
    .from('event_items')
    .insert([payload])
    .select()
    .single();

  if (error) {
    logger.error(`addItem: insert failed`, { eventId, userId, input, dbError: error });
    // Surface a better code using mapDbError if available
    return mapDbError(error);
  }
  logger.info(`addItem: success`, { eventId, itemId: (data as { id?: string } | null)?.id });
  return { ok:true,data: data as Item };
}

/** update name / category / perGuestQty */
export async function updateItem(
  eventId: string,
  itemId: string,
  actorId: string,        // NEW  – for permission checks
  payload: unknown
): Promise<ServiceResult<components['schemas']['Item']>> {
  // 1️⃣  Validate via generated schema (camelCase allowed)
  let parsed: z.infer<typeof schemas.ItemUpdate>;
  try {
    parsed = schemas.ItemUpdate.parse(payload);
  } catch (err) {
    return { ok: false, error: (err as Error).message, code: '400' };
  }

  // 2️⃣  Check event state & caller permissions
  const editableCheck = await ensureEventEditable(eventId, actorId);
  if (!editableCheck.ok) {
    return { ok: false, error: editableCheck.error, code: editableCheck.code };
  }                 // 403 / 404 / 409

  const canEdit = await ensureActorCanAssign(
    eventId,
    itemId,
    actorId,
    null                // null ⇒ we’re not changing assignment
  );
  if (!canEdit.ok) {
    return { ok: false, error: canEdit.error, code: canEdit.code };
  }                             // 403 / 404

  // 3️⃣  Whitelist editable fields & convert to snake_case
  const editableKeys = ['name', 'category', 'perGuestQty'] as const;
  const dbPayload    = toDbColumns(parsed, editableKeys);

  if (Object.keys(dbPayload).length === 0) {
    return { ok: false, error: 'No valid fields supplied', code: '400' };
  }

  // 4️⃣  Update row
  const { data, error } = await supabase
    .from('event_items')
    .update(dbPayload)
    .eq('id', itemId)
    .eq('event_id', eventId)
    .select()
    .single();

  if (error) return mapDbError(error);
  if (!data)  return { ok: false, error: 'NotFound', code: '404' };
  return { ok: true, data: data as components['schemas']['Item'] };
}


type ItemAssignPayload = {
  targetUserId: string | null;   // null ⇒ unassign
};

export async function assignItem(
  eventId: string,
  itemId: string,
  actorId: string,
  payload: ItemAssignPayload
): Promise<ServiceResult<Item>> {
  logger.debug('assignItem start', { eventId, itemId, actorId, payload });
  
  // 1️⃣  Validate input shape
  try {
    schemas.ItemAssign.parse(payload);
  } catch (err) {
    logger.error('assignItem validation error', { eventId, itemId, actorId, payload, error: err });
    return { ok: false, error: (err as Error).message, code: '400' };
  }

  // 2️⃣  Business checks
  const eventCheck = await ensureEventEditable(eventId);   // status not cancelled/completed
  if (!eventCheck.ok) return eventCheck;

  const canAssign = await ensureActorCanAssign(eventId, itemId, actorId, payload.targetUserId);
  if (!canAssign.ok) return canAssign;

  // 3️⃣  First check if item exists and get current state
  logger.debug('assignItem fetching existing item', { eventId, itemId });
  
  // First check if there are multiple items with the same ID (shouldn't happen but let's debug)
  const { data: allItems, error: listError } = await supabase
    .from('event_items')
    .select('id, assigned_to, event_id')
    .eq('id', itemId)
    .eq('event_id', eventId);
    
  if (listError) {
    logger.error('assignItem list check error', { eventId, itemId, error: listError });
    return mapDbError(listError);
  }
  
  if (allItems && allItems.length > 1) {
    logger.error('assignItem found duplicate items', { eventId, itemId, count: allItems.length, items: allItems });
    return { ok: false, error: 'Duplicate items found', code: '500' };
  }
  
  const { data: existingItem, error: fetchError } = await supabase
    .from('event_items')
    .select('id, assigned_to')
    .eq('id', itemId)
    .eq('event_id', eventId)
    .single();

  if (fetchError) {
    logger.error('assignItem fetch error', { 
      eventId, 
      itemId, 
      error: fetchError.message,
      code: fetchError.code 
    });
    return mapDbError(fetchError);
  }
  if (!existingItem) {
    return { ok: false, error: 'Item not found', code: '404' };
  }

  // 4️⃣  Validate assignment rules
  const currentAssignee = existingItem.assigned_to;
  if (payload.targetUserId === null) {
    // Unassign: only if currently assigned
    if (!currentAssignee) {
      return { ok: false, error: 'Item is not currently assigned', code: '409' };
    }
  } else {
    // Assign: only if currently unassigned
    if (currentAssignee) {
      return { ok: false, error: 'Item is already assigned', code: '409' };
    }
  }

  // 5️⃣  Perform the update
  logger.debug('assignItem performing update', { eventId, itemId, targetUserId: payload.targetUserId });
  const { data, error } = await supabase
    .from('event_items')
    .update({ assigned_to: payload.targetUserId })
    .eq('id', itemId)
    .eq('event_id', eventId)
    .select()
    .single();

  if (error) {
    logger.error('assignItem query error', { 
      eventId, 
      itemId, 
      targetUserId: payload.targetUserId, 
      error: error.message,
      code: error.code 
    });
    return mapDbError(error);
  }
  if (!data)  return { ok:false, error: 'NotFound', code: '404' };

  return { ok:true,data: data as Item };
}


/** delete slot */
export async function deleteItem(
  eventId: string,
  itemId: string
): Promise<ServiceResult<null>> {
  const { error } = await supabase
    .from('event_items')
    .delete()
    .eq('id', itemId);

  if (error) return { ok:false, error: error.message };
  return { ok: true, data: null };       // or { ok:false, error:'Forbidden', code:'403' }
}

/**
 * List items for an event with basic pagination. Rely on RLS to filter rows
 * so participants can only see items for events they can access.
 */
export async function listItems(
  eventId: string,
  _actorId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<ServiceResult<components['schemas']['Item'][]>> {
  const limit  = opts.limit  ?? 20;
  const offset = opts.offset ?? 0;

  const { data, error } = await supabase
    .from('event_items')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at')
    .range(offset, offset + limit - 1);

  if (error) return mapDbError(error);
  return { ok: true, data: (data || []) as components['schemas']['Item'][] };
}
/**
 * Fetch a single item row, ensuring it belongs to the given event.  RLS still
 * protects cross‑tenant access; the extra `eq('event_id', …)` guards against
 * accidental service‑role misuse.
 */
export async function getItem(
  eventId: string,
  itemId: string
): Promise<ServiceResult<components['schemas']['Item']>> {
  const { data, error } = await supabase
    .from('event_items')
    .select('*')
    .eq('id', itemId)
    .eq('event_id', eventId)
    .single();

  if (error) return mapDbError(error);
  if (!data)  return { ok: false, error: 'NotFound', code: '404' };

  return { ok: true, data: data as components['schemas']['Item'] };
}
