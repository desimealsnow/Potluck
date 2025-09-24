import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/authGuard';
import { RequestsService } from './requests.service';
import { handle } from '../../utils/helper';
import { 
  JoinRequestAdd, 
  EventIdParam, 
  RequestIdParam,
  ListRequestsQuery 
} from './requests.schema';
// logger imported elsewhere if needed; remove until used to satisfy lint

// ===============================================
// Controllers for join requests endpoints
// ===============================================

/**
 * GET /events/{eventId}/availability
 * Get event capacity availability
 */
export const getEventAvailability = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  
  // Validate eventId parameter
  const paramResult = EventIdParam.safeParse({ eventId });
  if (!paramResult.success) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Invalid event ID', 
      code: '400' 
    });
  }

  const result = await RequestsService.getEventAvailability(eventId);
  
  if (result.ok) {
    return res.status(200).json(result.data);
  }
  
  return handle(res, result);
};

/**
 * POST /events/{eventId}/requests 
 * Create join request (guest creates pending request + soft hold)
 */
export const createJoinRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  // Validate parameters
  const paramResult = EventIdParam.safeParse({ eventId });
  if (!paramResult.success) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Invalid event ID', 
      code: '400' 
    });
  }

  // Validate body
  const bodyResult = JoinRequestAdd.safeParse(req.body);
  if (!bodyResult.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid request data',
      code: '400',
      details: bodyResult.error.issues,
    });
  }

  const result = await RequestsService.createJoinRequest(
    eventId,
    userId,
    bodyResult.data
  );

  if (result.ok) {
    return res.status(201).json(result.data);
  }

  return handle(res, result);
};

/**
 * GET /events/{eventId}/requests
 * List join requests (host-only, paginated) 
 */
export const listJoinRequests = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  // Validate eventId
  const paramResult = EventIdParam.safeParse({ eventId });
  if (!paramResult.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid event ID',
      code: '400'
    });
  }

  // Parse and validate query parameters
  const queryParams = {
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 25,
    offset: req.query.offset ? parseInt(req.query.offset as string, 10) : 0,
    status: req.query.status as string | undefined,
  };

  const queryResult = ListRequestsQuery.safeParse(queryParams);
  if (!queryResult.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid query parameters',
      code: '400',
      details: queryResult.error.issues,
    });
  }

  const result = await RequestsService.listJoinRequests(
    eventId,
    userId,
    queryResult.data
  );

  if (result.ok) {
    return res.status(200).json(result.data);
  }

  return handle(res, result);
};

/**
 * PATCH /events/{eventId}/requests/{requestId}/approve
 * Approve join request (host-only, atomic capacity check)
 */
export const approveJoinRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, requestId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  // Validate parameters
  const paramResult = EventIdParam.merge(RequestIdParam).safeParse({ eventId, requestId });
  if (!paramResult.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid parameters',
      code: '400'
    });
  }

  const result = await RequestsService.approveRequest(requestId, userId);

  if (result.ok) {
    return res.status(200).json(result.data);
  }

  return handle(res, result);
};

/**
 * PATCH /events/{eventId}/requests/{requestId}/decline
 * Decline join request (host-only)
 */
export const declineJoinRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, requestId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  // Validate parameters
  const paramResult = EventIdParam.merge(RequestIdParam).safeParse({ eventId, requestId });
  if (!paramResult.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid parameters',
      code: '400'
    });
  }

  const result = await RequestsService.declineRequest(requestId, userId);

  if (result.ok) {
    return res.status(200).json(result.data);
  }

  return handle(res, result);
};

/**
 * PATCH /events/{eventId}/requests/{requestId}/waitlist
 * Move join request to waitlist (host-only)
 */
export const waitlistJoinRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, requestId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  // Validate parameters
  const paramResult = EventIdParam.merge(RequestIdParam).safeParse({ eventId, requestId });
  if (!paramResult.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid parameters',
      code: '400'
    });
  }

  const result = await RequestsService.waitlistRequest(requestId, userId);

  if (result.ok) {
    return res.status(200).json(result.data);
  }

  return handle(res, result);
};

/**
 * PATCH /events/{eventId}/requests/{requestId}/cancel
 * Cancel join request (guest cancels own request)
 */
export const cancelJoinRequest = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, requestId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  // Validate parameters
  const paramResult = EventIdParam.merge(RequestIdParam).safeParse({ eventId, requestId });
  if (!paramResult.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid parameters',
      code: '400'
    });
  }

  const result = await RequestsService.cancelRequest(requestId, userId);

  if (result.ok) {
    return res.status(200).json(result.data);
  }

  return handle(res, result);
};

/**
 * POST /events/{eventId}/requests/{requestId}/extend
 * Extend hold expiration (host-only, optional)
 */
export const extendJoinRequestHold = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, requestId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  // Validate parameters
  const paramResult = EventIdParam.merge(RequestIdParam).safeParse({ eventId, requestId });
  if (!paramResult.success) {
    return res.status(400).json({
      ok: false,
      error: 'Invalid parameters',
      code: '400'
    });
  }

  // Optional: parse extension duration from request body
  const extensionMinutes = req.body?.extension_minutes || 30;
  
  if (typeof extensionMinutes !== 'number' || extensionMinutes < 5 || extensionMinutes > 120) {
    return res.status(400).json({
      ok: false,
      error: 'Extension must be between 5 and 120 minutes',
      code: '400'
    });
  }

  const result = await RequestsService.extendRequestHold(
    requestId,
    userId,
    extensionMinutes
  );

  if (result.ok) {
    return res.status(200).json(result.data);
  }

  return handle(res, result);
};
