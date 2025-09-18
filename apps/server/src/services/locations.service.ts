import { supabase } from '../config/supabaseClient';
import { schemas }  from '../validators.quick';     // quick unblock stub
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