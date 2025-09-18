import { supabase } from '../config/supabaseClient';
import logger from '../logger';

export interface SignUpData {
  email: string;
  password: string;
  displayName?: string;
  latitude?: number;
  longitude?: number;
  city?: string;
  geo_precision?: 'exact' | 'city';
  discoverability_enabled?: boolean;
  discoverability_radius_km?: number;
}

export async function signup(
  email: string, 
  password: string, 
  displayName?: string,
  locationData?: {
    latitude?: number;
    longitude?: number;
    city?: string;
    geo_precision?: 'exact' | 'city';
    discoverability_enabled?: boolean;
    discoverability_radius_km?: number;
  }
) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };

  const userId = data.user!.id;

  // Create user profile with location data
  const profileData: any = {
    user_id: userId,
    display_name: displayName,
    discoverability_enabled: locationData?.discoverability_enabled ?? true,
    discoverability_radius_km: locationData?.discoverability_radius_km ?? 25,
    geo_precision: locationData?.geo_precision ?? 'city',
    city: locationData?.city
  };

  // Add location coordinates if provided
  if (locationData?.latitude && locationData?.longitude) {
    try {
      // Use the update_user_location function to set the geography
      const { error: locationError } = await supabase
        .rpc('update_user_location', {
          p_user_id: userId,
          p_latitude: locationData.latitude,
          p_longitude: locationData.longitude,
          p_city: locationData.city || null,
          p_geo_precision: locationData.geo_precision || 'city'
        });

      if (locationError) {
        logger.error('Error setting user location during signup:', locationError);
        // Continue with signup even if location fails
      } else {
        logger.info(`User location set during signup for user ${userId}`);
      }
    } catch (error) {
      logger.error('Error in location setup during signup:', error);
      // Continue with signup even if location fails
    }
  }

  // Insert basic profile data
  const { error: profileErr } = await supabase
    .from('user_profiles')
    .insert([profileData]);

  if (profileErr) {
    logger.error('Error creating user profile during signup:', profileErr);
    return { error: profileErr.message };
  }

  logger.info(`User profile created with location data for user ${userId}`);
  return { user: data.user, session: data.session };
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  return { user: data.user, session: data.session };
}

export async function logout(accessToken: string) {
  const { error } = await supabase.auth.signOut();
  if (error) return { error: error.message };
  return { success: true };
}
