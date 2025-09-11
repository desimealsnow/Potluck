import { Router } from 'express';
import { authGuard } from '../../middleware/authGuard';
import { routeLogger } from '../../middleware/logger.middleware';
import * as RequestsController from './requests.controller';

// ===============================================
// Join requests routes 
// Mounted under /events/:eventId/requests
// ===============================================

const router = Router({ mergeParams: true });

// ===============================================
// Note: Availability endpoint is handled in the main events routes
// ===============================================

// ===============================================
// Join requests collection endpoints
// ===============================================

/**
 * POST /events/{eventId}/requests
 * Create join request (guest creates pending request + soft hold)
 */
router.post(
  '/',
  routeLogger('POST /events/:eventId/requests'),
  RequestsController.createJoinRequest
);

/**
 * GET /events/{eventId}/requests  
 * List join requests (host-only, paginated)
 */
router.get(
  '/',
  authGuard,
  routeLogger('GET /events/:eventId/requests'),
  RequestsController.listJoinRequests
);

// ===============================================
// Individual request action endpoints
// ===============================================

/**
 * PATCH /events/{eventId}/requests/{requestId}/approve
 * Approve join request (host-only, atomic capacity check)
 */
router.patch(
  '/:requestId/approve',
  authGuard,
  routeLogger('PATCH /events/:eventId/requests/:requestId/approve'),
  RequestsController.approveJoinRequest
);

/**
 * PATCH /events/{eventId}/requests/{requestId}/decline
 * Decline join request (host-only)
 */
router.patch(
  '/:requestId/decline',
  authGuard,
  routeLogger('PATCH /events/:eventId/requests/:requestId/decline'),
  RequestsController.declineJoinRequest
);

/**
 * PATCH /events/{eventId}/requests/{requestId}/waitlist
 * Move join request to waitlist (host-only)
 */
router.patch(
  '/:requestId/waitlist',
  authGuard,
  routeLogger('PATCH /events/:eventId/requests/:requestId/waitlist'),
  RequestsController.waitlistJoinRequest
);

/**
 * PATCH /events/{eventId}/requests/{requestId}/cancel
 * Cancel join request (guest cancels own request)
 */
router.patch(
  '/:requestId/cancel',
  routeLogger('PATCH /events/:eventId/requests/:requestId/cancel'),
  RequestsController.cancelJoinRequest
);

/**
 * POST /events/{eventId}/requests/{requestId}/extend
 * Extend hold expiration (host-only, optional)
 */
router.post(
  '/:requestId/extend',
  authGuard,
  routeLogger('POST /events/:eventId/requests/:requestId/extend'),
  RequestsController.extendJoinRequestHold
);

export default router;
