import { supabase } from '../config/supabaseClient';
import logger from '../logger';
import { ServiceResult } from '../utils/helper';

export interface LocationSearchParams {
  lat: number;
  lon: number;
  radius_km?: number;
  limit?: number;
  offset?: number;
  q?: string; // text search
  date_from?: string;
  date_to?: string;
  diet?: string;
}

export interface NearbyEvent {
  id: string;
  title: string;
  description: string;
  event_date: string;
  city: string;
  distance_m: number;
  is_public: boolean;
  status: string;
  capacity_total: number;
  attendee_count: number;
  latitude?: number;
  longitude?: number;
}

export interface EventWithLocation {
  id: string;
  title: string;
  description: string;
  event_date: string;
  city: string;
  latitude: number;
  longitude: number;
  is_public: boolean;
  status: string;
  capacity_total: number;
  attendee_count: number;
  available_spots: number;
}

/**
 * Search for nearby events using location-based queries
 */
export async function searchNearbyEvents(
  params: LocationSearchParams
): Promise<ServiceResult<{ events: NearbyEvent[], total: number }>> {
  try {
    const {
      lat,
      lon,
      radius_km = 25,
      limit = 25,
      offset = 0,
      q,
      date_from,
      date_to,
      diet
    } = params;

    // Validate coordinates
    if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return { ok: false, error: 'Invalid coordinates' };
    }

    // Validate radius
    if (radius_km < 1 || radius_km > 200) {
      return { ok: false, error: 'Radius must be between 1 and 200 km' };
    }

    logger.info(`Searching for events near ${lat}, ${lon} within ${radius_km}km`);

    // Build the base query with location filtering
    let query = supabase
      .rpc('find_nearby_events', {
        user_lat: lat,
        user_lon: lon,
        radius_km: radius_km,
        limit_count: limit,
        offset_count: offset
      });

    // Apply additional filters if provided
    if (q) {
      // For text search, we'll need to filter after the RPC call
      // This is a limitation of the current approach - we might need to refactor
      logger.info(`Text search filter: ${q}`);
    }

    if (date_from) {
      // Date filtering would need to be added to the RPC function
      logger.info(`Date from filter: ${date_from}`);
    }

    if (date_to) {
      // Date filtering would need to be added to the RPC function
      logger.info(`Date to filter: ${date_to}`);
    }

    if (diet) {
      // Diet filtering would need to be added to the RPC function
      logger.info(`Diet filter: ${diet}`);
    }

    const { data: events, error } = await query;

    if (error) {
      logger.error('Error searching nearby events:', error);
      return { ok: false, error: error.message };
    }

    // Apply client-side filters for now (ideally these would be in the RPC function)
    let filteredEvents = events || [];

    if (q) {
      const searchTerm = q.toLowerCase();
      filteredEvents = filteredEvents.filter((event: any) => 
        event.title.toLowerCase().includes(searchTerm) ||
        event.description?.toLowerCase().includes(searchTerm) ||
        event.city?.toLowerCase().includes(searchTerm)
      );
    }

    if (date_from) {
      const fromDate = new Date(date_from);
      filteredEvents = filteredEvents.filter((event: any) => 
        new Date(event.event_date) >= fromDate
      );
    }

    if (date_to) {
      const toDate = new Date(date_to);
      filteredEvents = filteredEvents.filter((event: any) => 
        new Date(event.event_date) <= toDate
      );
    }

    // Get total count for pagination (this is approximate due to client-side filtering)
    const total = filteredEvents.length;

    // Apply pagination
    const paginatedEvents = filteredEvents.slice(0, limit);

    logger.info(`Found ${paginatedEvents.length} events near location`);

    return { 
      ok: true, 
      data: { 
        events: paginatedEvents, 
        total 
      } 
    };

  } catch (error) {
    logger.error('Error in searchNearbyEvents:', error);
    return { ok: false, error: 'Failed to search nearby events' };
  }
}

/**
 * Get event details with location information
 */
export async function getEventWithLocation(
  eventId: string
): Promise<ServiceResult<EventWithLocation>> {
  try {
    const { data, error } = await supabase
      .rpc('get_event_with_location', { event_uuid: eventId });

    if (error) {
      logger.error('Error fetching event with location:', error);
      return { ok: false, error: error.message };
    }

    if (!data || data.length === 0) {
      return { ok: false, error: 'Event not found' };
    }

    return { ok: true, data: data[0] };

  } catch (error) {
    logger.error('Error in getEventWithLocation:', error);
    return { ok: false, error: 'Failed to fetch event with location' };
  }
}

/**
 * Search events by city name (fallback when no coordinates)
 */
export async function searchEventsByCity(
  city: string,
  limit: number = 25,
  offset: number = 0
): Promise<ServiceResult<{ events: NearbyEvent[], total: number }>> {
  try {
    logger.info(`Searching for events in city: ${city}`);

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        city,
        is_public,
        status,
        capacity_total,
        attendee_count
      `)
      .eq('status', 'published')
      .eq('is_public', true)
      .ilike('city', `%${city}%`)
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error searching events by city:', error);
      return { ok: false, error: error.message };
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('is_public', true)
      .ilike('city', `%${city}%`);

    if (countError) {
      logger.error('Error counting events by city:', countError);
      return { ok: false, error: countError.message };
    }

    const nearbyEvents: NearbyEvent[] = (events || []).map(event => ({
      ...event,
      distance_m: 0, // No distance calculation for city search
      latitude: undefined,
      longitude: undefined
    }));

    logger.info(`Found ${nearbyEvents.length} events in city ${city}`);

    return { 
      ok: true, 
      data: { 
        events: nearbyEvents, 
        total: count || 0 
      } 
    };

  } catch (error) {
    logger.error('Error in searchEventsByCity:', error);
    return { ok: false, error: 'Failed to search events by city' };
  }
}

/**
 * Get popular events (fallback when no location is set)
 */
export async function getPopularEvents(
  limit: number = 25,
  offset: number = 0
): Promise<ServiceResult<{ events: NearbyEvent[], total: number }>> {
  try {
    logger.info('Fetching popular events');

    const { data: events, error } = await supabase
      .from('events')
      .select(`
        id,
        title,
        description,
        event_date,
        city,
        is_public,
        status,
        capacity_total,
        attendee_count
      `)
      .eq('status', 'published')
      .eq('is_public', true)
      .order('attendee_count', { ascending: false })
      .order('event_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error('Error fetching popular events:', error);
      return { ok: false, error: error.message };
    }

    // Get total count
    const { count, error: countError } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('is_public', true);

    if (countError) {
      logger.error('Error counting popular events:', countError);
      return { ok: false, error: countError.message };
    }

    const nearbyEvents: NearbyEvent[] = (events || []).map(event => ({
      ...event,
      distance_m: 0, // No distance calculation for popular events
      latitude: undefined,
      longitude: undefined
    }));

    logger.info(`Found ${nearbyEvents.length} popular events`);

    return { 
      ok: true, 
      data: { 
        events: nearbyEvents, 
        total: count || 0 
      } 
    };

  } catch (error) {
    logger.error('Error in getPopularEvents:', error);
    return { ok: false, error: 'Failed to fetch popular events' };
  }
}
