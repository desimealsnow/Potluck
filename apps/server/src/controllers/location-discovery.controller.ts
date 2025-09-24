import { Request, Response } from 'express';
import { z } from 'zod';
import { searchNearbyEvents, getEventWithLocation, searchEventsByCity, getPopularEvents } from '../services/location-discovery.service';
import { getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead, getUnreadNotificationCount, registerPushToken, getNotificationPreferences, upsertNotificationPreferences } from '../services/notifications.service';
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
 * GET /api/v1/events/discover/nearby
 * Search for events near a location
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
    
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in searchNearbyEventsController:', error.issues);
      return res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.issues 
      });
    }
    
    logger.error('Error in searchNearbyEventsController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/events/discover/city
 * Search for events by city name
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
    
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      logger.warn('Validation error in searchEventsByCityController:', error.issues);
      return res.status(400).json({ 
        error: 'Invalid query parameters', 
        details: error.issues 
      });
    }
    
    logger.error('Error in searchEventsByCityController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/events/discover/popular
 * Get popular events (fallback when no location)
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
    
  } catch (error: unknown) {
    logger.error('Error in getPopularEventsController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/events/:eventId/location
 * Get event details with location information
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
 * GET /api/v1/notifications
 * Get user notifications
 */
export const getUserNotificationsController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const status = (req.query.status as string | undefined) === 'unread' ? 'unread' : undefined;
    
    logger.info(`Notifications request for user ${userId}: limit=${limit}, offset=${offset}`);
    
    const result = await getUserNotifications(userId, limit, offset, status);
    
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
    
  } catch (error: unknown) {
    logger.error('Error in getUserNotificationsController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/v1/notifications/:notificationId/read
 * Mark notification as read
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
      logger.warn('Validation error in markNotificationAsReadController:', error.issues);
      return res.status(400).json({ 
        error: 'Invalid parameters', 
        details: error.issues 
      });
    }
    
    logger.error('Error in markNotificationAsReadController:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all notifications as read
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
 * GET /api/v1/notifications/unread-count
 * Get unread notification count
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

/**
 * POST /api/v1/push/register
 * Register Expo/Web push token for current user
 */
export const registerPushTokenController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const { platform, token } = (req.body || {}) as { platform?: 'ios' | 'android' | 'web'; token?: string };
    if (!platform || !token) return res.status(400).json({ error: 'platform and token are required' });
    const result = await registerPushToken(userId, platform, token);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ id: result.data.id });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/v1/me/notification-preferences
 */
export const getNotificationPreferencesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const result = await getNotificationPreferences(userId);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json(result.data);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PUT /api/v1/me/notification-preferences
 */
export const putNotificationPreferencesController = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Authentication required' });
    const prefs = req.body || {};
    const result = await upsertNotificationPreferences(userId, prefs);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json(result.data);
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
};
