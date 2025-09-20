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
  authGuard,
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
  authGuard,
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

// Reorder waitlist position (host-only)
router.patch(
  '/:requestId/reorder',
  authGuard,
  routeLogger('PATCH /events/:eventId/requests/:requestId/reorder'),
  async (req, res) => {
    const { eventId, requestId } = req.params as any;
    const pos = Number((req.body || {}).waitlist_pos);
    if (!isFinite(pos)) return res.status(400).json({ ok: false, error: 'waitlist_pos required', code: '400' });
    const { supabase } = await import('../../config/supabaseClient');
    const { data, error } = await supabase
      .from('event_join_requests')
      .update({ waitlist_pos: pos })
      .eq('id', requestId)
      .eq('event_id', eventId)
      .eq('status', 'waitlisted')
      .select('*')
      .single();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json(data);
  }
);

// Promote first eligible from waitlist (host-only)
router.post(
  '/promote',
  authGuard,
  routeLogger('POST /events/:eventId/requests/promote'),
  async (req, res) => {
    const { eventId } = req.params as any;
    const { supabase } = await import('../../config/supabaseClient');
    const { data, error } = await supabase.rpc('promote_from_waitlist', { p_event_id: eventId });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    return res.json({ moved: Number(data) || 0 });
  }
);

export default router;
