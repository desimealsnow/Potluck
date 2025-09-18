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
 * Handles the retrieval of the user's location profile.
 *
 * This function checks for user authentication, retrieves the user ID from the request,
 * and calls the getUserLocationProfile function to fetch the user's location data.
 * It handles errors related to authentication and data retrieval, returning appropriate
 * HTTP status codes and messages based on the outcome.
 *
 * @param req - The request object containing user information.
 * @param res - The response object used to send back the desired HTTP response.
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
 * Update user location based on the provided request data.
 *
 * This function checks for user authentication, validates the incoming location data using LocationUpdateSchema,
 * and then attempts to update the user's location. If the update is successful, it returns the updated data;
 * otherwise, it handles errors appropriately, including validation errors and internal server errors.
 *
 * @param req - The request object containing user information and location data.
 * @param res - The response object used to send back the desired HTTP response.
 * @throws z.ZodError If the request data fails validation.
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
      logger.warn('Validation error in updateUserLocationController:', error.errors);
      return res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
    }
    
    logger.error('Error in updateUserLocationController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update user discoverability settings.
 *
 * This function handles the PATCH request to update the discoverability settings for a user. It first checks for user authentication, validates the request body against the DiscoverabilitySettingsSchema, and then attempts to update the settings using the updateDiscoverabilitySettings function. If the update is unsuccessful, it returns an error response. It also handles validation errors and logs relevant information.
 *
 * @param req - The request object containing user information and settings data.
 * @param res - The response object used to send back the desired HTTP response.
 * @throws z.ZodError If the request data fails validation against the schema.
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
      logger.warn('Validation error in updateDiscoverabilityController:', error.errors);
      return res.status(400).json({ 
        error: 'Invalid request data', 
        details: error.errors 
      });
    }
    
    logger.error('Error in updateDiscoverabilityController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Removes the user's location from the database.
 *
 * This controller function handles the removal of a user's location by first checking if the user is authenticated.
 * If the user ID is not present, it responds with a 401 status. It logs the action and calls the removeUserLocation
 * function to perform the deletion. If the operation fails, it returns a 400 status with an error message;
 * otherwise, it responds with a success message. Any errors during the process are logged and a 500 status is returned.
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
 * Handles the search for cities based on query parameters.
 *
 * This function parses the query parameters from the request, logs the search request,
 * and calls the searchCities function to retrieve the results. If the search is unsuccessful,
 * it responds with an error message. It also handles validation errors and logs them accordingly.
 *
 * @param req - The request object containing query parameters for the city search.
 * @param res - The response object used to send back the desired HTTP response.
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
      logger.warn('Validation error in searchCitiesController:', error.errors);
      return res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.errors 
      });
    }
    
    logger.error('Error in searchCitiesController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
