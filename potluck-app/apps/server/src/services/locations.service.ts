import { supabase } from '../config/supabaseClient';
import { schemas }  from '../validators';           // <- generated Zod objects
import { components } from '../../../../libs/common/src/types.gen';
type LocationInput  = components['schemas']['Location'];

export async function createLocation(raw: LocationInput) {
  const input = schemas.Location.parse(raw);        // <- validate once

  const { data, error } = await supabase
    .from('locations')
    .insert([input])
    .select('id, name')
    .single();

  if (error) return { error: error.message };
  return { location: data };
}

export async function resolveLocation(raw: LocationInput, userId: string) {
  const input = schemas.Location.parse(raw);        // <- validate once
  const { place_id, name } = input;

  /* 1️⃣ by place_id */
  let { data: loc, error } = place_id
    ? await supabase
        .from('locations')
        .select('id')
        .eq('place_id', place_id)
        .single()
    : { data: null, error: null };

  if (error && error.code !== 'PGRST116') throw new Error(error.message); // true DB error

  /* 2️⃣ by canonical_name */
  if (!loc) {
    ({ data: loc, error } = await supabase
      .from('locations')
      .select('id')
      .eq('canonical_name', name.trim().toLowerCase())
      .single());

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
  }

  /* 3️⃣ insert */
  if (!loc) {
    ({ data: loc, error } = await supabase
      .from('locations')
      .insert([
        {
          place_id: place_id ?? null,
          name,
          formatted_address: input.formatted_address ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          created_by: userId
        }
      ])
      .select('id')
      .single());

    if (error) throw new Error(error.message);
  }

  return loc!.id as string;
}
