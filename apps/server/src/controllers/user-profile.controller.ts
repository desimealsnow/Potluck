import { Request, Response } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
import logger from '../logger';

// Validation schemas
const ProfileSetupSchema = z.object({
  display_name: z.string().min(1, 'Display name is required'),
  meal_preferences: z.array(z.string()).optional().default([]),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  discoverability_radius_km: z.number().int().min(1).max(200).optional().default(25)
});

/**
 * POST /api/v1/user-profile/setup
 * Complete user profile setup
 */
export const completeProfileSetupController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Validate request body
    const validationResult = ProfileSetupSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.issues 
      });
    }
    
    const { display_name, meal_preferences, city, latitude, longitude, discoverability_radius_km } = validationResult.data;
    
    logger.info(`Completing profile setup for user ${userId}`);
    
    // Update user profile in database
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        user_id: userId,
        display_name: display_name.trim(),
        meal_preferences: meal_preferences,
        setup_completed: true,
        city: city,
        discoverability_radius_km: discoverability_radius_km,
        discoverability_enabled: true,
        geo_precision: 'exact',
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      logger.error('Error updating user profile:', profileError);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    // Save location if provided
    if (city && latitude && longitude) {
      try {
        // Convert coordinates to PostGIS geography
        const { error: locationError } = await supabase
          .rpc('st_geogfromtext', { 
            wkt: `POINT(${longitude} ${latitude})` 
          });

        if (!locationError) {
          // Update with location data
          const { error: updateLocationError } = await supabase
            .from('user_profiles')
            .update({
              home_geog: `POINT(${longitude} ${latitude})`,
              geo_precision: 'exact'
            })
            .eq('user_id', userId);

          if (updateLocationError) {
            logger.warn('Failed to save location data:', updateLocationError);
          }
        }
      } catch (locationError) {
        logger.warn('Failed to process location data:', locationError);
      }
    }

    // Try to update user metadata (non-blocking)
    try {
      await supabase.auth.updateUser({
        data: { 
          display_name: display_name.trim(),
          meal_preferences: meal_preferences
        }
      });
    } catch (metadataError) {
      logger.warn('Failed to update user metadata:', metadataError);
    }

    res.json({ 
      success: true, 
      message: 'Profile setup completed successfully' 
    });
    
  } catch (error) {
    logger.error('Error in completeProfileSetupController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/user-profile/me
 * Get current user profile
 */
export const getUserProfileController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      logger.error('Error fetching user profile:', error);
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }

    if (!data) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Extract coordinates from PostGIS geography if available
    let latitude: number | undefined;
    let longitude: number | undefined;

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
          }
        }
      } catch (coordError) {
        logger.warn('Error extracting coordinates from geography:', coordError);
      }
    }

    // Return profile data with extracted coordinates
    const profileData = {
      ...data,
      latitude,
      longitude
    };

    res.json(profileData);
    
  } catch (error) {
    logger.error('Error in getUserProfileController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
