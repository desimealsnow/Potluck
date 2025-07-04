import { supabase } from '../config/supabaseClient';
import { components } from '../../../../libs/common/src/types.gen';
import { z } from 'zod';
import { schemas }  from '../validators';           // <- generated Zod objects
import {ServiceResult, toDbColumns, mapDbError } from '../utils/helper';
import {GuardResult,ensureEventEditable,ensureActorCanAssign} from '../utils/eventGuards';
type ItemCreate  = components['schemas']['ItemCreate'];
type ItemUpdate   = components['schemas']['ItemUpdate'];
type Item  = components['schemas']['Item'];


const ALLOWED_UPDATE_FIELDS = ['name', 'category', 'perGuestQty'] as const;
/** create a new item slot */
export async function addItem(
  eventId: string,
  input: ItemCreate,
  userId: string
): Promise<ServiceResult<components['schemas']['Item']>> {
  const { data, error } = await supabase
    .from('event_items')
    .insert([{ ...input, event_id: eventId, host_id: userId }])
    .select()
    .single();

  if (error)  return { ok:false, error: 'NotFound', code: '404' };
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
  // 1️⃣  Validate input shape
  schemas.ItemAssign.parse(payload);

  // 2️⃣  Business checks
  const eventCheck = await ensureEventEditable(eventId);   // status not cancelled/completed
  if (!eventCheck.ok) return eventCheck;

  const canAssign = await ensureActorCanAssign(eventId, itemId, actorId, payload.targetUserId);
  if (!canAssign.ok) return canAssign;

  // 3️⃣  Attempt assignment (optimistic)
  const { data, error } = await supabase
    .from('event_items')
    .update({ assigned_to: payload.targetUserId })
    .eq('id', itemId)
    .eq('event_id', eventId)
    .is('assigned_to', payload.targetUserId === null ? 'not.is' : 'is') // only assign if currently unassigned (or undo)
    .select()
    .single();

  if (error) return mapDbError(error);
  if (!data)  return { ok:false, error: 'NotFound', code: '404' };

  return { ok:true,data: data as Item };
}


/** delete slot */
export async function deleteItem(
  eventId: string,
  itemId: string,
  actorId: string
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
  actorId: string,
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
  itemId: string,
  actorId: string
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
