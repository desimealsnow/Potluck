import { supabase } from '../config/supabaseClient';
import { ServiceResult, mapDbError } from '../utils/helper';

type CatalogFilters = { q?: string; category?: string };
type CatalogItem = { id: string; name: string; category?: string | null; unit?: string | null; dietary_tags?: string[] | null };

export async function listCatalog(filters: CatalogFilters): Promise<ServiceResult<CatalogItem[]>> {
  let q = supabase
    .from('item_catalog')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (filters.category) q = q.eq('category', filters.category);
  if (filters.q) q = q.ilike('name', `%${filters.q}%`);

  const { data, error } = await q;
  if (error) return mapDbError(error);
  return { ok: true, data: (data || []) as CatalogItem[] };
}

export async function listMyItems(userId: string): Promise<ServiceResult<CatalogItem[]>> {
  const { data, error } = await supabase
    .from('user_items')
    .select('*')
    .eq('user_id', userId)
    .order('name');
  if (error) return mapDbError(error);
  return { ok: true, data: (data || []) as CatalogItem[] };
}

export async function createMyItem(userId: string, payload: Partial<CatalogItem> & { default_per_guest_qty?: number; notes?: string | null }): Promise<ServiceResult<CatalogItem>> {
  const insert = {
    user_id: userId,
    name: payload?.name,
    category: payload?.category ?? null,
    unit: payload?.unit ?? null,
    default_per_guest_qty: payload?.default_per_guest_qty ?? 1.0,
    dietary_tags: payload?.dietary_tags ?? [],
    notes: payload?.notes ?? null,
  };
  const { data, error } = await supabase
    .from('user_items')
    .insert(insert)
    .select('*')
    .single();
  if (error) return mapDbError(error);
  return { ok: true, data: data as CatalogItem };
}

export async function updateMyItem(userId: string, id: string, payload: Partial<CatalogItem> & { default_per_guest_qty?: number; notes?: string | null }): Promise<ServiceResult<CatalogItem>> {
  const update: Record<string, unknown> = {};
  for (const key of ['name','category','unit','default_per_guest_qty','dietary_tags','notes']) {
    if (payload?.[key] !== undefined) update[key] = payload[key];
  }
  const { data, error } = await supabase
    .from('user_items')
    .update(update)
    .eq('id', id)
    .eq('user_id', userId)
    .select('*')
    .maybeSingle();
  if (error) return mapDbError(error);
  if (!data) return { ok: false, error: 'NotFound', code: '404' };
  return { ok: true, data: data as CatalogItem };
}

export async function deleteMyItem(userId: string, id: string): Promise<ServiceResult<null>> {
  const { error, count } = await supabase
    .from('user_items')
    .delete({ count: 'exact' })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) return mapDbError(error);
  if (!count) return { ok: false, error: 'NotFound', code: '404' };
  return { ok: true, data: null };
}


