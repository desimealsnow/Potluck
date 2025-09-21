import { supabase } from '../config/supabaseClient';
import { } from '../services/participants.service';
import logger from '../logger';
import { notifyEventParticipantsCancelled } from './notifications.service';
import {ServiceResult,mapDbError,toDbColumns} from "../utils/helper";
import { schemas }  from '../validators';           // <- generated Zod objects

import { components } from '../../../../libs/common/src/types.gen';
import { createClient } from '@supabase/supabase-js';
type CreateEventInput  = components['schemas']['EventCreate'];
type EventFull = components['schemas']['EventFull'];
type EventSummary = components['schemas']['EventSummary'];
type EventWithItems     = components['schemas']['EventWithItems'];
type EventUpdateInput = components['schemas']['EventUpdate'];
type EventCancelInput = components['schemas']['EventCancel'];

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

  // 2a️⃣ Ensure events.is_public defaults to true for newly created events
  try {
    const newEventId = (data as any)?.event?.id as string | undefined;
    const isPublic = (data as any)?.event?.is_public as boolean | undefined;
    if (newEventId && (isPublic === undefined || isPublic === false)) {
      await supabase
        .from('events')
        .update({ is_public: true })
        .eq('id', newEventId);
      (data as any).event.is_public = true;
    }
  } catch (e) {
    logger.warn('[EventService] set default is_public=true failed (non-fatal)', { error: (e as Error)?.message });
  }

  // 2b️⃣  Persist latitude/longitude to locations if provided in payload (RPC may not set them)
  try {
    const hasCoords = typeof (input as any)?.latitude === 'number' && typeof (input as any)?.longitude === 'number';
    if (hasCoords) {
      // Find the location_id for the newly created event
      const newEventId = (data as any)?.event?.id as string | undefined;
      if (newEventId) {
        const { data: evRow } = await supabase
          .from('events')
          .select('location_id')
          .eq('id', newEventId)
          .single();
        const locId = evRow?.location_id as string | undefined;
        if (locId) {
          // Attempt to update the existing location with coordinates
          const { error: updErr } = await supabase
            .from('locations')
            .update({
              latitude: (input as any).latitude,
              longitude: (input as any).longitude,
              updated_at: new Date().toISOString(),
            })
            .eq('id', locId);

          // If update failed or coords remain null (e.g., uniqueness on generated columns),
          // create a fresh location row with coords and repoint the event.
          let needRepoint = !!updErr;
          if (!needRepoint) {
            const { data: locAfter } = await supabase
              .from('locations')
              .select('id, latitude, longitude, name, formatted_address')
              .eq('id', locId)
              .single();
            needRepoint = !locAfter?.latitude || !locAfter?.longitude;
          }

          if (needRepoint) {
            const { data: locBefore } = await supabase
              .from('locations')
              .select('name, formatted_address')
              .eq('id', locId)
              .single();

            const newName = (locBefore?.name || 'Location') + ' #' + String(newEventId).slice(0, 8);
            const { data: newLoc, error: insErr } = await supabase
              .from('locations')
              .insert({
                name: newName,
                formatted_address: locBefore?.formatted_address ?? null,
                latitude: (input as any).latitude,
                longitude: (input as any).longitude,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .select('id')
              .single();

            if (!insErr && newLoc?.id) {
              await supabase
                .from('events')
                .update({ location_id: newLoc.id })
                .eq('id', newEventId);
            } else if (insErr) {
              logger.warn('[EventService] fallback location insert failed', { error: insErr.message });
            }
          }
        }
      }
    }
  } catch (e) {
    logger.warn('[EventService] location lat/lon post-update failed (non-fatal)', { error: (e as Error)?.message });
  }

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
  jwt?: string                    // token now OPTIONAL
): Promise<ServiceResult<
  EventFull & { event: EventFull['event'] & { ownership: 'mine' | 'invited' } } & { host?: { name?: string | null; avatar_url?: string | null } }
>> {
  /* 1️⃣ Build a Supabase client.
        - If jwt is present  → user-scoped client (RLS enforced)
        - Else              → service-role client (bypass RLS, backend-only) */

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    jwt
      ? process.env.SUPABASE_ANON_KEY!          // anon key + user token
      : process.env.SUPABASE_SERVICE_ROLE_KEY!, // backend fallback
    jwt
      ? { global: { headers: { Authorization: `Bearer ${jwt}` } } }
      : undefined
  );

  /* 2️⃣  (optional) log the identity PostgREST sees */
  if (jwt) {
    const { data: { user }, error } = await supabase.auth.getUser(jwt);
    if (error) logger.warn('[EventService] getUser error', { error });

    logger.debug('[EventService] DB sees user', { id: user?.id });
  } else {
    logger.debug('[EventService] Using service-role key (no RLS)');
  }


  /* 3️⃣  Deep-select event + relations */
  const { data, error } = await supabase
    .from('events')
    .select(`
      id, created_by, title, description, event_date, min_guests, max_guests,
      meal_type, attendee_count, status, is_public,
      location:locations (
         name, formatted_address, latitude, longitude
      ),
      items:event_items (
        id, name, category, per_guest_qty, required_qty, assigned_to
      ),
      participants:event_participants (
        id, user_id, status, joined_at, party_size
      )
    `)
    .eq('id', eventId)
    .maybeSingle();

    /* 👉 1️⃣  real DB / PostgREST error */
  if (error && error.code !== 'PGRST116') {
    logger.error('[EventService] DB error', { eventId, error });
    return {
      ok:   false,
      code: '500',                   // or error.code (42703) if you prefer
      error: error.message ?? 'Database error',
      details: error                 // keep the whole object for controller
    };
  }
  if (!data) {
    logger.warn('[EventService] Event not found', { eventId, error });
    return { ok: false, error: 'Event not found', code: '404' };
  }

  /* 4️⃣  Fetch host profile (created_by → user_profiles.display_name) */
  let hostProfile: { display_name?: string | null; avatar_url?: string | null } | null = null;
  try {
    // Try to get from user_profiles table
    const { data: host, error: hostError } = await supabase
      .from('user_profiles')
      .select('display_name, avatar_url')
      .eq('user_id', data.created_by)
      .maybeSingle();
    if (!hostError && host) {
      hostProfile = host as any;
    }

    // If no display_name, try to get from auth.users using admin client
    if (!hostProfile || !hostProfile.display_name) {
      try {
        const admin = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        const { data: userData, error: userError } = await admin.auth.admin.getUserById(data.created_by);
        if (!userError && userData?.user) {
          const user = userData.user;
          const display = user.user_metadata?.display_name || (user.email ? String(user.email).split('@')[0] : null);
          if (display) {
            hostProfile = {
              display_name: display,
              avatar_url: user.user_metadata?.avatar_url ?? null,
            };
          }
        }
      } catch (authError) {
        logger.warn('[EventService] Failed to fetch user from auth.users', { error: authError, userId: data.created_by });
      }
    }

    // Final fallback: Use a more meaningful default when display_name is still null
    if (!hostProfile || !hostProfile.display_name) {
      // If we still don't have a display name, use a generic fallback
      hostProfile = {
        display_name: 'Host',
        avatar_url: null,
      };
    }
  } catch {
    // Non-fatal; continue without host profile
  }

  /* 5️⃣  Assemble payload */
  // Determine ownership based on created_by and current user
  const isOwner = jwt ? (() => {
    try {
      const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
      return data.created_by === payload.sub;
    } catch {
      return false;
    }
  })() : false;

  const response: EventFull & { event: EventFull['event'] & { ownership: 'mine' | 'invited', is_public: boolean } } & { host?: { name?: string | null; avatar_url?: string | null } } = {
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
      status: data.status,
      is_public: data.is_public,
      ownership: isOwner ? 'mine' : 'invited',
      location: Array.isArray(data.location) ? data.location[0] : data.location
    },
    items: data.items ?? [],
    participants: data.participants ?? [],
    host: hostProfile ? { 
      name: hostProfile.display_name || 'Host', 
      avatar_url: hostProfile.avatar_url ?? null 
    } : { name: 'Host', avatar_url: null }
  };

  logger.info('[EventService] getEventDetails success', { eventId });
  return { ok: true, data: response };
}




interface ListEventsParams {
  limit?: number;
  offset?: number;
  status?: string;
  ownership?: string;
  meal_type?: string;
  startsAfter?: string;
  startsBefore?: string;
  // Location-based search parameters
  lat?: number;
  lon?: number;
  radius_km?: number;
  near?: string;
  q?: string;
  diet?: string;
  is_public?: boolean;
  // Include related data
  include?: string;
}

interface PaginatedEventSummary {
  items: ViewerEventSummary[];
  totalCount: number;
  nextOffset: number | null;
}

// Row shape returned by the events list query above (unused - keeping for reference)
// type EventRow = {
//   id: string;
//   title: string;
//   event_date: string;
//   attendee_count: number;
//   meal_type: components['schemas']['EventSummary']['meal_type'];
//   status: string;
//   created_by: string;
// };

// Enriched summary we return to the client for list views
type ViewerEventSummary = EventSummary & {
  ownership: 'mine' | 'invited';
  viewer_role: 'host' | 'guest';
  location?: {
    id: string;
    name: string;
    formatted_address: string;
    latitude: number;
    longitude: number;
    place_id: string;
  };
};

export async function listEvents(
  userId: string,
  {
    limit = 20,
    offset = 0,
    status,
    ownership,
    meal_type,
    startsAfter,
    startsBefore,
    // Location-based search parameters
    lat,
    lon,
    radius_km,
    near,
    q,
    diet,
    is_public,
    include
  }: ListEventsParams
): Promise<ServiceResult<PaginatedEventSummary>> {
  logger.info('[EventService] listEvents', { 
    userId, limit, offset, status, ownership, meal_type, startsAfter, startsBefore,
    lat, lon, radius_km, near, q, diet, is_public, include
  });

  // Check if this is a location-based search
  const isLocationSearch = (lat && lon) || near;
  const isDiscoveryMode = is_public === true || isLocationSearch;

  if (isLocationSearch) {
    // Use location-based search
    return await performLocationBasedSearch(userId, {
      limit, offset, status, ownership, meal_type, startsAfter, startsBefore,
      lat, lon, radius_km, near, q, diet, is_public
    });
  } else if (isDiscoveryMode) {
    // Use discovery mode (public events + user's events)
    return await performDiscoverySearch(userId, {
      limit, offset, status, ownership, meal_type, startsAfter, startsBefore,
      q, diet, is_public
    });
  } else {
    // Use traditional mode (user's events only)
    return await performTraditionalSearch(userId, {
      limit, offset, status, ownership, meal_type, startsAfter, startsBefore, q
    });
  }
}

// Location-based search using PostGIS
async function performLocationBasedSearch(
  userId: string,
  params: ListEventsParams
): Promise<ServiceResult<PaginatedEventSummary>> {
  const { lat, lon, radius_km = 25, near, q, diet, limit = 20, offset = 0, include } = params;
  
  try {
    let events: any[] = [];
    let totalCount = 0;

    if (lat && lon) {
      // Search by coordinates via RPC
      const { data, error } = await supabase
        .rpc('find_nearby_events', {
          user_lat: lat,
          user_lon: lon,
          radius_km: radius_km,
          limit_count: limit,
          offset_count: offset
        });

      if (error) {
        logger.error('Error in location-based search:', error);
        return { ok: false, error: error.message, code: '500' };
      }

      events = data || [];

      // Fallback: if RPC returns no rows (e.g., schema variant without events.location_geog)
      if (!events.length) {
        try {
          // Fetch published, public events with joined locations and compute distance client-side
        const selectFields = `
          id, title, description, event_date, is_public, status, capacity_total, attendee_count,
          location_id,
          locations!inner ( id, name, latitude, longitude, lat6, lon6, formatted_address, place_id )
        `;
            
          const { data: joined, error: joinErr } = await supabase
            .from('events')
            .select(selectFields)
            .eq('status', 'published')
            // Include all published events; some schemas may not persist is_public yet
            .order('event_date', { ascending: false })
            .range(offset, offset + limit - 1);

          if (joinErr) {
            logger.error('Location join fallback failed:', joinErr);
            return { ok: false, error: joinErr.message, code: '500' };
          }

          const toRad = (v: number) => (v * Math.PI) / 180;
          const R = 6371; // km
          const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const dLat = toRad(lat2 - lat1);
            const dLon = toRad(lon2 - lon1);
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
          };

          const computed = (joined || [])
            .filter((e: any) => (
              e.locations && (
                e.locations.latitude != null || e.locations.lat6 != null
              ) && (
                e.locations.longitude != null || e.locations.lon6 != null
              )
            ))
            .map((e: any) => {
              const locLat = e.locations.latitude ?? (typeof e.locations.lat6 === 'number' ? e.locations.lat6 / 1_000_000 : null);
              const locLon = e.locations.longitude ?? (typeof e.locations.lon6 === 'number' ? e.locations.lon6 / 1_000_000 : null);
              const dKm = haversineKm(lat, lon, locLat, locLon);
              return {
                id: e.id,
                title: e.title,
                description: e.description,
                event_date: e.event_date,
                city: e.locations?.formatted_address || null,
                distance_m: dKm * 1000,
                is_public: e.is_public,
                status: e.status,
                capacity_total: e.capacity_total,
                attendee_count: e.attendee_count
              };
            })
            .filter(e => (radius_km ? e.distance_m <= radius_km * 1000 : true))
            .sort((a, b) => (a.distance_m - b.distance_m) || (new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));

          totalCount = computed.length;
          events = computed.slice(0, limit);
        } catch (fallbackErr) {
          logger.error('Error in client-side location fallback:', fallbackErr);
          return { ok: false, error: 'Failed to perform location-based search', code: '500' };
        }
      } else {
        totalCount = events.length; // approximate
      }
    } else if (near) {
      // Search by city/area name
      const shouldIncludeLocation = include === 'location';
      const selectFields = 'id, title, event_date, attendee_count, meal_type, status, created_by, city, location_geog, location_id, locations(id, name, formatted_address, latitude, longitude, place_id)';
        
      const { data, error } = await supabase
        .from('events')
        .select(selectFields)
        .eq('status', 'published')
        .eq('is_public', true)
        .ilike('city', `%${near}%`)
        .order('event_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('Error in city-based search:', error);
        return { ok: false, error: error.message, code: '500' };
      }

      events = data || [];
      
      // Get total count
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published')
        .eq('is_public', true)
        .ilike('city', `%${near}%`);
      
      totalCount = count || 0;
    }

    // Apply client-side filters
    let filteredEvents = events;

    if (q) {
      const searchTerm = q.toLowerCase();
      filteredEvents = filteredEvents.filter(event => 
        event.title.toLowerCase().includes(searchTerm) ||
        event.description?.toLowerCase().includes(searchTerm) ||
        event.city?.toLowerCase().includes(searchTerm)
      );
    }

    if (diet) {
      const dietTypes = diet.split(',');
      filteredEvents = filteredEvents.filter(event => 
        dietTypes.includes(event.meal_type)
      );
    }

    // Convert to ViewerEventSummary format
    const shouldIncludeLocation = include === 'location';
    const items: ViewerEventSummary[] = filteredEvents.map((e: any) => {
      const baseItem = {
        id: e.id,
        title: e.title,
        event_date: e.event_date,
        attendee_count: e.attendee_count,
        meal_type: e.meal_type,
        ownership: (e.created_by === userId ? 'mine' : 'invited') as 'mine' | 'invited',
        viewer_role: (e.created_by === userId ? 'host' : 'guest') as 'host' | 'guest',
      };

      // Include location data if requested and available
      if (e.locations) {
        return {
          ...baseItem,
          location: {
            id: e.locations.id,
            name: e.locations.name,
            formatted_address: e.locations.formatted_address,
            latitude: e.locations.latitude,
            longitude: e.locations.longitude,
            place_id: e.locations.place_id,
          }
        };
      }

      return baseItem;
    });

    const nextOffset = offset + limit < totalCount ? offset + limit : null;

    return {
      ok: true,
      data: {
        items,
        totalCount,
        nextOffset
      }
    };

  } catch (error) {
    logger.error('Error in performLocationBasedSearch:', error);
    return { ok: false, error: 'Failed to perform location-based search', code: '500' };
  }
}

// Discovery mode search (public events + user's events)
async function performDiscoverySearch(
  userId: string,
  params: ListEventsParams
): Promise<ServiceResult<PaginatedEventSummary>> {
  const { limit = 20, offset = 0, q, diet, status = 'published', include } = params;
  
  try {
    // Get user's participant events
    const { data: partRows, error: partErr } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', userId);

    if (partErr) {
      logger.error('Error fetching participant events', partErr);
      return { ok: false, error: partErr.message, code: '500' };
    }
    const participantIds = partRows?.map(r => r.event_id) ?? [];

    // Always include location data
    const selectFields = 'id, title, event_date, attendee_count, meal_type, status, created_by, city, description, location_id, locations(id, name, formatted_address, latitude, longitude, place_id)';
    
    let query = supabase
      .from('events')
      .select(selectFields, { count: 'exact' })
      .eq('status', status)
      .order('event_date', { ascending: false });

    // Apply ownership filter (public + user's events)
    if (participantIds.length) {
      const orCondition = `created_by.eq.${userId},id.in.(${participantIds.join(',')}),is_public.eq.true`;
      query = query.or(orCondition);
    } else {
      const orCondition = `created_by.eq.${userId},is_public.eq.true`;
      query = query.or(orCondition);
    }

    // Apply text search
    if (q) {
      const searchTerm = q.toLowerCase();
      // Note: This is a simple implementation. For better search, consider using full-text search
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,city.ilike.%${searchTerm}%`);
    }

    // Apply diet filter
    if (diet) {
      const dietTypes = diet.split(',');
      query = query.in('meal_type', dietTypes);
    }

    const { data: events, error: listErr, count } = await query.range(offset, offset + limit - 1);

    if (listErr) {
      logger.error('Error fetching discovery events', listErr);
      return { ok: false, error: listErr.message, code: '500' };
    }

    // Debug logging for location include
    if (include === 'location') {
      logger.info('Location include debug - raw events data:', JSON.stringify(events, null, 2));
    }

    const items: ViewerEventSummary[] = (events ?? []).map((e: any) => {
      const baseItem = {
        id: e.id,
        title: e.title,
        event_date: e.event_date,
        attendee_count: e.attendee_count,
        meal_type: e.meal_type,
        ownership: (e.created_by === userId ? 'mine' : 'invited') as 'mine' | 'invited',
        viewer_role: (e.created_by === userId ? 'host' : 'guest') as 'host' | 'guest',
      };

      // Include location data if requested and available
      if (e.locations) {
        return {
          ...baseItem,
          location: {
            id: e.locations.id,
            name: e.locations.name,
            formatted_address: e.locations.formatted_address,
            latitude: e.locations.latitude,
            longitude: e.locations.longitude,
            place_id: e.locations.place_id,
          }
        };
      }

      return baseItem;
    });

    const totalCount = count || 0;
    const nextOffset = offset + limit < totalCount ? offset + limit : null;

    return {
      ok: true,
      data: {
        items,
        totalCount,
        nextOffset
      }
    };

  } catch (error) {
    logger.error('Error in performDiscoverySearch:', error);
    return { ok: false, error: 'Failed to perform discovery search', code: '500' };
  }
}

// Traditional search (user's events only)
async function performTraditionalSearch(
  userId: string,
  params: ListEventsParams
): Promise<ServiceResult<PaginatedEventSummary>> {
  const { limit = 20, offset = 0, status, ownership, meal_type, startsAfter, startsBefore, q, include } = params;
  
  try {
    // Find all event_ids where the user is a participant (including host)
    const { data: partRows, error: partErr } = await supabase
      .from('event_participants')
      .select('event_id')
      .eq('user_id', userId);

    if (partErr) {
      logger.error('Error fetching participant events', partErr);
      return { ok: false, error: partErr.message, code: '500' };
    }
    const participantIds = partRows?.map(r => r.event_id) ?? [];

    // Always include location data
    const selectFields = 'id, title, event_date, attendee_count, meal_type, status, created_by, location_id, locations(id, name, formatted_address, latitude, longitude, place_id)';
    
    let query = supabase
      .from('events')
      .select(selectFields, { count: 'exact' })
      .order('event_date', { ascending: false });

    // Apply all filters using the helper function
    query = applyEventFilters(query, { userId, participantIds, status, ownership, meal_type, startsAfter, startsBefore, q, include });

    const { data: events, error: listErr, count } = await query.range(offset, offset + limit - 1);

    if (listErr) {
      logger.error('Error fetching events', listErr);
      return { ok: false, error: listErr.message, code: '500' };
    }

    const items: ViewerEventSummary[] = (events ?? []).map((e: any) => {
      const baseItem = {
        id: e.id,
        title: e.title,
        event_date: e.event_date,
        attendee_count: e.attendee_count,
        meal_type: e.meal_type,
        ownership: (e.created_by === userId ? 'mine' : 'invited') as 'mine' | 'invited',
        viewer_role: (e.created_by === userId ? 'host' : 'guest') as 'host' | 'guest',
      };

      // Include location data if requested and available
      if (e.locations) {
        return {
          ...baseItem,
          location: {
            id: e.locations.id,
            name: e.locations.name,
            formatted_address: e.locations.formatted_address,
            latitude: e.locations.latitude,
            longitude: e.locations.longitude,
            place_id: e.locations.place_id,
          }
        };
      }

      return baseItem;
    });

    const totalCount = count || 0;
    const nextOffset = offset + limit < totalCount ? offset + limit : null;

    return {
      ok: true,
      data: {
        items,
        totalCount,
        nextOffset
      }
    };

  } catch (error) {
    logger.error('Error in performTraditionalSearch:', error);
    return { ok: false, error: 'Failed to perform traditional search', code: '500' };
  }
}

function applyEventFilters<B>(
  builder: B,
  {
    userId,
    participantIds,
    status,
    ownership,
    meal_type,
    startsAfter,
    startsBefore,
    q,
    include
  }: {
    userId: string,
    participantIds: string[],
    status?: string,
    ownership?: string,
    meal_type?: string,
    startsAfter?: string,
    startsBefore?: string,
    q?: string,
    include?: string
  }
): B {
  logger.info('[EventService] applyEventFilters', { 
    userId, 
    participantIds: participantIds.length, 
    status, 
    ownership, 
    meal_type, 
    startsAfter, 
    startsBefore,
    q,
    include
  });

  // Apply ownership filter
  // Use an any-typed local to avoid deep generic instantiation from Postgrest types
  let b: any = builder;
  if (ownership === 'mine') {
    logger.info('[EventService] Applying mine filter');
    b = b.eq('created_by', userId);
  } else if (ownership === 'invited') {
    logger.info('[EventService] Applying invited filter');
    if (participantIds.length) {
      b = b.in('id', participantIds).neq('created_by', userId);
    } else {
      // No events if user is not a participant anywhere
      b = b.eq('id', '00000000-0000-0000-0000-000000000000');
    }
  } else {
    // 'all' or undefined
    logger.info('[EventService] Applying all filter');
    // If requesting published events, also include publicly visible ones
    if (status === 'published') {
      logger.info('[EventService] Including public events for published status');
      if (participantIds.length) {
        const orCondition = `created_by.eq.${userId},id.in.(${participantIds.join(',')}),is_public.eq.true`;
        logger.info('[EventService] OR condition', { orCondition });
        b = b.or(orCondition);
      } else {
        const orCondition = `created_by.eq.${userId},is_public.eq.true`;
        logger.info('[EventService] OR condition', { orCondition });
        b = b.or(orCondition);
      }
    } else {
      // For non-published views, restrict to my owned or where I'm a participant
      logger.info('[EventService] Restricting to owned/participant events');
      if (participantIds.length) {
        const orCondition = `created_by.eq.${userId},id.in.(${participantIds.join(',')})`;
        logger.info('[EventService] OR condition', { orCondition });
        b = b.or(orCondition);
      } else {
        b = b.eq('created_by', userId);
      }
    }
  }
  
  if (status) {
    logger.info('[EventService] Adding status filter', { status });
    b = b.eq('status', status);
  }
  if (meal_type) {
    logger.info('[EventService] Adding meal_type filter', { meal_type });
    b = b.in('meal_type', meal_type.split(','));
  }
  if (startsAfter) {
    logger.info('[EventService] Adding startsAfter filter', { startsAfter });
    b = b.gte('event_date', startsAfter);
  }
  if (startsBefore) {
    logger.info('[EventService] Adding startsBefore filter', { startsBefore });
    b = b.lte('event_date', startsBefore);
  }
  
  // Add text search filter
  if (q && q.trim()) {
    logger.info('[EventService] Adding text search filter', { q });
    const searchTerm = q.trim();
    // Search in title and description using case-insensitive pattern matching
    b = b.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
  }
  
  return b as B;
}


// Helper: Checks if event can be edited
async function ensureEventEditable(eventId: string, actorId: string): Promise<ServiceResult<{ event: EventFull['event'] }>> {
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

  return { ok: true, data: { event: data as EventFull['event'] } };
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
  const fullEvent = await getEventDetails(eventId);
  if (!fullEvent.ok) {
    logger.warn('Event updated, but unable to fetch full details', { eventId });
    return fullEvent as ServiceResult<EventFull>;
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
): Promise<ServiceResult<any>> {
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
  const result = await getEventDetails(eventId);
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
    const sent = await notifyEventParticipantsCancelled(eventId, actorId, payload.reason);
    if (!sent.ok) {
      logger.warn('[EventService] Failed to notify participants on cancel', { eventId, error: sent.error });
    } else {
      logger.info('[EventService] Notified participants on cancel', { eventId, notified_count: sent.data.notified_count });
    }
  }

  // 7️⃣ Return full event details
  const result = await getEventDetails(eventId);
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
  const result = await getEventDetails(eventId);
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
const { error: delErr, count } = await supabase
  .from('events')
  .delete({ count: 'exact' })
  .eq('id', eventId)
  .select('id');                 // Prefer: return=representation

  if (delErr) {
    logger.error('[EventService] Failed to delete event', { eventId, delErr });
    return { ok: false, error: delErr.message || 'Delete failed', code: '500' };
  }
  if (!count) {                    // nothing deleted
    return { ok: false, error: 'Forbidden or not found', code: '404' };
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
  const result = await getEventDetails(eventId);
  if (!result.ok) return result;

  return { ok: true, data: result.data };
}
