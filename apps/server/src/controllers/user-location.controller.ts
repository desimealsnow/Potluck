import { Request, Response } from 'express';
import { z } from 'zod';
import { 
  updateUserLocation, 
  updateDiscoverabilitySettings, 
  getUserLocationProfile, 
  removeUserLocation,
  searchCities 
} from '../services/user-location.service';
import logger from '../logger';

// Validation schemas
const LocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Invalid latitude'),
  longitude: z.number().min(-180).max(180, 'Invalid longitude'),
  city: z.string().optional(),
  geo_precision: z.enum(['exact', 'city']).optional()
});

const DiscoverabilitySettingsSchema = z.object({
  discoverability_enabled: z.boolean(),
  discoverability_radius_km: z.number().int().min(1).max(200, 'Radius must be between 1 and 200 km'),
  geo_precision: z.enum(['exact', 'city'])
});

const CitySearchQuery = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters'),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10).refine(val => val >= 1 && val <= 50, 'Limit must be between 1 and 50')
});

/**
 * GET /api/v1/me/location
 * Get user location profile
 */
export const getUserLocationController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    logger.info(`Get user location profile for user ${userId}`);
    
    const result = await getUserLocationProfile(userId);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result.data);
    
  } catch (error) {
    logger.error('Error in getUserLocationController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/v1/me/location
 * Update user location
 */
export const updateUserLocationController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const locationData = LocationUpdateSchema.parse(req.body);
    
    logger.info(`Update user location for user ${userId}:`, locationData);
    
    const result = await updateUserLocation(userId, locationData);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result.data);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in updateUserLocationController:', error.issues);
      return res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.issues 
      });
    }
    
    logger.error('Error in updateUserLocationController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/v1/me/discoverability
 * Update user discoverability settings
 */
export const updateDiscoverabilityController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const settingsData = DiscoverabilitySettingsSchema.parse(req.body);
    
    logger.info(`Update discoverability settings for user ${userId}:`, settingsData);
    
    const result = await updateDiscoverabilitySettings(userId, settingsData);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result.data);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in updateDiscoverabilityController:', error.issues);
      return res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.issues 
      });
    }
    
    logger.error('Error in updateDiscoverabilityController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/v1/me/location
 * Remove user location
 */
export const removeUserLocationController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    logger.info(`Remove user location for user ${userId}`);
    
    const result = await removeUserLocation(userId);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ success: true });
    
  } catch (error) {
    logger.error('Error in removeUserLocationController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/cities/search
 * Search for cities
 */
export const searchCitiesController = async (req: Request, res: Response) => {
  try {
    const queryParams = CitySearchQuery.parse(req.query);
    
    logger.info(`Search cities request: ${queryParams.q}`);
    
    const result = await searchCities(queryParams.q, queryParams.limit);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ cities: result.data.cities });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in searchCitiesController:', error.issues);
      return res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.issues 
      });
    }
    
    logger.error('Error in searchCitiesController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
