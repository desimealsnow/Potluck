import { Request, Response } from 'express';
import { z } from 'zod';
import { searchNearbyEvents, getEventWithLocation, searchEventsByCity, getPopularEvents } from '../services/location-discovery.service';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount } from '../services/notifications.service';
import logger from '../logger';

// Validation schemas
const LocationSearchQuery = z.object({
  lat: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val >= -90 && val <= 90, 'Invalid latitude'),
  lon: z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val >= -180 && val <= 180, 'Invalid longitude'),
  radius_km: z.string().optional().transform(val => val ? parseInt(val) : 25).refine(val => val >= 1 && val <= 200, 'Radius must be between 1 and 200 km'),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 25).refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0).refine(val => val >= 0, 'Offset must be non-negative'),
  q: z.string().optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  diet: z.string().optional()
});

const CitySearchQuery = z.object({
  city: z.string().min(1, 'City name is required'),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 25).refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0).refine(val => val >= 0, 'Offset must be non-negative')
});

const NotificationParams = z.object({
  notificationId: z.string().uuid('Invalid notification ID')
});

/**
 * Handles the search for events near a specified location.
 *
 * This controller processes the incoming request to search for nearby events based on the provided query parameters.
 * It validates the parameters, logs the request, and calls the `searchNearbyEvents` function to retrieve the events.
 * If the search is unsuccessful, it responds with an error message. In case of validation errors, it returns a 400 status
 * with details about the validation issues. Any other errors result in a 500 status response.
 *
 * @param req - The request object containing query parameters for the location search.
 * @param res - The response object used to send back the desired HTTP response.
 */
export const searchNearbyEventsController = async (req: Request, res: Response) => {
  try {
    const queryParams = LocationSearchQuery.parse(req.query);
    
    logger.info(`Location search request: ${JSON.stringify(queryParams)}`);
    
    const result = await searchNearbyEvents(queryParams);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      events: result.data.events,
      pagination: {
        total: result.data.total,
        limit: queryParams.limit,
        offset: queryParams.offset,
        has_more: result.data.total > queryParams.offset + queryParams.limit
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in searchNearbyEventsController:', error.errors);
      return res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.errors 
      });
    }
    
    logger.error('Error in searchNearbyEventsController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Handles the search for events by city name.
 *
 * This controller function processes a GET request to search for events based on the city name provided in the query parameters. It validates the input using CitySearchQuery, logs the request, and calls the searchEventsByCity function to retrieve the events. If the search is unsuccessful, it returns an error response. The function also handles validation errors and logs any unexpected errors that occur during execution.
 *
 * @param req - The request object containing query parameters for the city search.
 * @param res - The response object used to send back the desired HTTP response.
 */
export const searchEventsByCityController = async (req: Request, res: Response) => {
  try {
    const queryParams = CitySearchQuery.parse(req.query);
    
    logger.info(`City search request: ${JSON.stringify(queryParams)}`);
    
    const result = await searchEventsByCity(queryParams.city, queryParams.limit, queryParams.offset);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      events: result.data.events,
      pagination: {
        total: result.data.total,
        limit: queryParams.limit,
        offset: queryParams.offset,
        has_more: result.data.total > queryParams.offset + queryParams.limit
      }
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in searchEventsByCityController:', error.errors);
      return res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.errors 
      });
    }
    
    logger.error('Error in searchEventsByCityController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Handles the GET request for popular events with pagination.
 *
 * This function retrieves popular events based on the specified limit and offset from the request query parameters.
 * It logs the request details and calls the getPopularEvents function to fetch the events. If the result is not successful,
 * it responds with an error message. Otherwise, it returns the events along with pagination information.
 *
 * @param req - The request object containing query parameters for limit and offset.
 * @param res - The response object used to send back the desired HTTP response.
 * @throws Error If an internal error occurs during the processing of the request.
 */
export const getPopularEventsController = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 25;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    logger.info(`Popular events request: limit=${limit}, offset=${offset}`);
    
    const result = await getPopularEvents(limit, offset);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      events: result.data.events,
      pagination: {
        total: result.data.total,
        limit,
        offset,
        has_more: result.data.total > offset + limit
      }
    });
    
  } catch (error) {
    logger.error('Error in getPopularEventsController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Handles the GET request for event details with location information.
 *
 * This controller retrieves the event ID from the request parameters and validates its presence.
 * It logs the request and calls the getEventWithLocation function to fetch the event details.
 * If the event ID is missing or the event is not found, it responds with the appropriate error status.
 * In case of an internal error, it logs the error and returns a 500 status.
 *
 * @param req - The request object containing the event ID in the parameters.
 * @param res - The response object used to send the response back to the client.
 */
export const getEventWithLocationController = async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    
    if (!eventId) {
      return res.status(400).json({ error: 'Event ID is required' });
    }
    
    logger.info(`Event location request: ${eventId}`);
    
    const result = await getEventWithLocation(eventId);
    
    if (!result.ok) {
      return res.status(404).json({ error: result.error });
    }
    
    res.json(result.data);
    
  } catch (error) {
    logger.error('Error in getEventWithLocationController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user notifications from the API.
 *
 * This function handles the GET request to retrieve notifications for a user. It checks for user authentication,
 * processes pagination parameters (limit and offset), and calls the getUserNotifications function to fetch the data.
 * If the request is successful, it returns the notifications along with pagination details; otherwise, it handles errors accordingly.
 *
 * @param req - The request object containing user information and query parameters.
 * @param res - The response object used to send back the desired HTTP response.
 * @throws Error If an internal server error occurs during the process.
 */
export const getUserNotificationsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    
    logger.info(`Notifications request for user ${userId}: limit=${limit}, offset=${offset}`);
    
    const result = await getUserNotifications(userId, limit, offset);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({
      notifications: result.data.notifications,
      pagination: {
        total: result.data.total,
        limit,
        offset,
        has_more: result.data.total > offset + limit
      }
    });
    
  } catch (error) {
    logger.error('Error in getUserNotificationsController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Mark a notification as read for a user.
 *
 * This function retrieves the user ID from the request, validates the notification ID, and calls the markNotificationAsRead function to update the notification status. It handles authentication checks, validation errors, and logs relevant information throughout the process.
 *
 * @param req - The request object containing user information and parameters.
 * @param res - The response object used to send back the desired HTTP response.
 * @throws Error If there is a validation error or an internal server error occurs.
 */
export const markNotificationAsReadController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    const { notificationId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const params = NotificationParams.parse({ notificationId });
    
    logger.info(`Mark notification as read: ${notificationId} for user ${userId}`);
    
    const result = await markNotificationAsRead(params.notificationId, userId);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json(result.data);
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in markNotificationAsReadController:', error.errors);
      return res.status(400).json({ 
        error: 'Invalid parameters', 
        details: error.errors 
      });
    }
    
    logger.error('Error in markNotificationAsReadController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Marks all notifications as read for the authenticated user.
 *
 * This controller function retrieves the user ID from the request object. If the user is not authenticated, it responds with a 401 status.
 * It then calls the markAllNotificationsAsRead function to update the notifications. If the update fails, a 400 status is returned with the error.
 * On success, it responds with the count of updated notifications. Any errors during the process are logged and a 500 status is returned.
 *
 * @param req - The request object containing user information.
 * @param res - The response object used to send responses back to the client.
 */
export const markAllNotificationsAsReadController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    logger.info(`Mark all notifications as read for user ${userId}`);
    
    const result = await markAllNotificationsAsRead(userId);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ updated_count: result.data.updated_count });
    
  } catch (error) {
    logger.error('Error in markAllNotificationsAsReadController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Handles the GET request for the unread notification count.
 *
 * This controller retrieves the user ID from the request, checks for authentication,
 * and logs the request. It then calls the getUnreadNotificationCount function to
 * fetch the count of unread notifications. If the request is successful, it responds
 * with the count; otherwise, it handles errors appropriately.
 *
 * @param req - The request object containing user information.
 * @param res - The response object used to send the response back to the client.
 */
export const getUnreadNotificationCountController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    logger.info(`Unread count request for user ${userId}`);
    
    const result = await getUnreadNotificationCount(userId);
    
    if (!result.ok) {
      return res.status(400).json({ error: result.error });
    }
    
    res.json({ count: result.data.count });
    
  } catch (error) {
    logger.error('Error in getUnreadNotificationCountController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
