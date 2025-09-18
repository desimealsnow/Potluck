import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { routeLogger } from '../middleware/logger.middleware';
import * as DiscoveryController from '../controllers/location-discovery.controller';

const router = Router();

/*──────────────────────────────────────────────────────────────
  Event Discovery Routes
──────────────────────────────────────────────────────────────*/

// Search events near a location
router.get(
  '/events/nearby',
  authGuard,
  routeLogger('GET /discovery/events/nearby'),
  DiscoveryController.searchNearbyEventsController
);

// Search events by city name
router.get(
  '/events/city',
  authGuard,
  routeLogger('GET /discovery/events/city'),
  DiscoveryController.searchEventsByCityController
);

// Get popular events (fallback when no location)
router.get(
  '/events/popular',
  authGuard,
  routeLogger('GET /discovery/events/popular'),
  DiscoveryController.getPopularEventsController
);

// Get event with location details
router.get(
  '/events/:eventId/location',
  authGuard,
  routeLogger('GET /discovery/events/:eventId/location'),
  DiscoveryController.getEventWithLocationController
);

/*──────────────────────────────────────────────────────────────
  Notification Routes
──────────────────────────────────────────────────────────────*/

// Get user notifications
router.get(
  '/notifications',
  authGuard,
  routeLogger('GET /discovery/notifications'),
  DiscoveryController.getUserNotificationsController
);

// Mark notification as read
router.patch(
  '/notifications/:notificationId/read',
  authGuard,
  routeLogger('PATCH /discovery/notifications/:notificationId/read'),
  DiscoveryController.markNotificationAsReadController
);

// Mark all notifications as read
router.patch(
  '/notifications/read-all',
  authGuard,
  routeLogger('PATCH /discovery/notifications/read-all'),
  DiscoveryController.markAllNotificationsAsReadController
);

// Get unread notification count
router.get(
  '/notifications/unread-count',
  authGuard,
  routeLogger('GET /discovery/notifications/unread-count'),
  DiscoveryController.getUnreadNotificationCountController
);

export default router;