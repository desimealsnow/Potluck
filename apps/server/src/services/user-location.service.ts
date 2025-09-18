import { supabase } from '../config/supabaseClient';
import logger from '../logger';
import { ServiceResult } from '../utils/helper';

export interface UserLocationUpdate {
  latitude: number;
  longitude: number;
  city?: string;
  geo_precision?: 'exact' | 'city';
}

export interface UserLocationSettings {
  discoverability_enabled: boolean;
  discoverability_radius_km: number;
  geo_precision: 'exact' | 'city';
}

export interface UserLocationProfile {
  user_id: string;
  city: string | null;
  discoverability_enabled: boolean;
  discoverability_radius_km: number;
  geo_precision: 'exact' | 'city';
  has_location: boolean;
  latitude?: number;
  longitude?: number;
}

/**
 * Update user location from coordinates
 */
export async function updateUserLocation(
  userId: string,
  location: UserLocationUpdate
): Promise<ServiceResult<UserLocationProfile>> {
  try {
    logger.info(`Updating location for user ${userId}: ${location.latitude}, ${location.longitude}`);

    // Validate coordinates
    if (location.latitude < -90 || location.latitude > 90) {
      return { ok: false, error: 'Invalid latitude' };
    }
    if (location.longitude < -180 || location.longitude > 180) {
      return { ok: false, error: 'Invalid longitude' };
    }

    // Validate geo_precision
    if (location.geo_precision && !['exact', 'city'].includes(location.geo_precision)) {
      return { ok: false, error: 'Invalid geo_precision. Must be "exact" or "city"' };
    }

    // Update user location using the database function
    const { data, error } = await supabase
      .rpc('update_user_location', {
        p_user_id: userId,
        p_latitude: location.latitude,
        p_longitude: location.longitude,
        p_city: location.city || null,
        p_geo_precision: location.geo_precision || 'city'
      });

    if (error) {
      logger.error('Error updating user location:', error);
      return { ok: false, error: error.message };
    }

    if (!data) {
      return { ok: false, error: 'User not found' };
    }

    // Get updated user profile
    const profile = await getUserLocationProfile(userId);
    if (!profile.ok) {
      return profile;
    }

    logger.info(`Successfully updated location for user ${userId}`);
    return { ok: true, data: profile.data };

  } catch (error) {
    logger.error('Error in updateUserLocation:', error);
    return { ok: false, error: 'Failed to update user location' };
  }
}

/**
 * Update user discoverability settings
 */
export async function updateDiscoverabilitySettings(
  userId: string,
  settings: UserLocationSettings
): Promise<ServiceResult<UserLocationProfile>> {
  try {
    logger.info(`Updating discoverability settings for user ${userId}:`, settings);

    // Validate radius
    if (settings.discoverability_radius_km < 1 || settings.discoverability_radius_km > 200) {
      return { ok: false, error: 'Discoverability radius must be between 1 and 200 km' };
    }

    // Validate geo_precision
    if (!['exact', 'city'].includes(settings.geo_precision)) {
      return { ok: false, error: 'Invalid geo_precision. Must be "exact" or "city"' };
    }

    // Update user profile
    const { error } = await supabase
      .from('user_profiles')
      .update({
        discoverability_enabled: settings.discoverability_enabled,
        discoverability_radius_km: settings.discoverability_radius_km,
        geo_precision: settings.geo_precision,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      logger.error('Error updating discoverability settings:', error);
      return { ok: false, error: error.message };
    }

    // Get updated user profile
    const profile = await getUserLocationProfile(userId);
    if (!profile.ok) {
      return profile;
    }

    logger.info(`Successfully updated discoverability settings for user ${userId}`);
    return { ok: true, data: profile.data };

  } catch (error) {
    logger.error('Error in updateDiscoverabilitySettings:', error);
    return { ok: false, error: 'Failed to update discoverability settings' };
  }
}

/**
 * Get user location profile
 */
export async function getUserLocationProfile(
  userId: string
): Promise<ServiceResult<UserLocationProfile>> {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(`
        user_id,
        city,
        discoverability_enabled,
        discoverability_radius_km,
        geo_precision,
        home_geog
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user location profile:', error);
      return { ok: false, error: error.message };
    }

    if (!data) {
      return { ok: false, error: 'User profile not found' };
    }

    // Extract coordinates if location exists
    let latitude: number | undefined;
    let longitude: number | undefined;
    let has_location = false;

    if (data.home_geog) {
      try {
        // Convert geography to geometry to extract coordinates
        const { data: coords, error: coordsError } = await supabase
          .rpc('st_astext', { geom: data.home_geog });

        if (!coordsError && coords) {
          // Parse POINT(lon lat) format
          const match = coords.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (match) {
            longitude = parseFloat(match[1]);
            latitude = parseFloat(match[2]);
            has_location = true;
          }
        }
      } catch (coordError) {
        logger.warn('Error extracting coordinates from geography:', coordError);
      }
    }

    const profile: UserLocationProfile = {
      user_id: data.user_id,
      city: data.city,
      discoverability_enabled: data.discoverability_enabled,
      discoverability_radius_km: data.discoverability_radius_km,
      geo_precision: data.geo_precision,
      has_location,
      latitude,
      longitude
    };

    return { ok: true, data: profile };

  } catch (error) {
    logger.error('Error in getUserLocationProfile:', error);
    return { ok: false, error: 'Failed to fetch user location profile' };
  }
}

/**
 * Remove user location (for privacy)
 */
export async function removeUserLocation(
  userId: string
): Promise<ServiceResult<{ success: boolean }>> {
  try {
    logger.info(`Removing location for user ${userId}`);

    const { error } = await supabase
      .from('user_profiles')
      .update({
        home_geog: null,
        geo_precision: 'city',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      logger.error('Error removing user location:', error);
      return { ok: false, error: error.message };
    }

    logger.info(`Successfully removed location for user ${userId}`);
    return { ok: true, data: { success: true } };

  } catch (error) {
    logger.error('Error in removeUserLocation:', error);
    return { ok: false, error: 'Failed to remove user location' };
  }
}

/**
 * Get suggested cities based on partial input
 */
export async function searchCities(
  query: string,
  limit: number = 10
): Promise<ServiceResult<{ cities: string[] }>> {
  try {
    if (!query || query.length < 2) {
      return { ok: true, data: { cities: [] } };
    }

    logger.info(`Searching cities: ${query}`);

    // Get unique cities from events and user profiles
    const { data: eventCities, error: eventError } = await supabase
      .from('events')
      .select('city')
      .not('city', 'is', null)
      .ilike('city', `%${query}%`)
      .limit(limit);

    const { data: profileCities, error: profileError } = await supabase
      .from('user_profiles')
      .select('city')
      .not('city', 'is', null)
      .ilike('city', `%${query}%`)
      .limit(limit);

    if (eventError || profileError) {
      logger.error('Error searching cities:', eventError || profileError);
      return { ok: false, error: 'Failed to search cities' };
    }

    // Combine and deduplicate cities
    const allCities = [
      ...(eventCities || []).map(row => row.city),
      ...(profileCities || []).map(row => row.city)
    ].filter(Boolean);

    const uniqueCities = [...new Set(allCities)]
      .sort()
      .slice(0, limit);

    return { ok: true, data: { cities: uniqueCities } };

  } catch (error) {
    logger.error('Error in searchCities:', error);
    return { ok: false, error: 'Failed to search cities' };
  }
}
