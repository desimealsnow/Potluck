import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authGuard';
import * as EventService from '../services/events.service';
import { notifyNearbyUsers } from '../services/notifications.service';
import { components } from '../../../../libs/common/src/types.gen';
import debug from 'debug';
import { handle } from '../utils/helper';          // httpStatus + JSON wrapper
import { z } from 'zod';

const log = debug('potluck:events');
log('Debug namespace is Event Controller');

type CreateEventInput  = components['schemas']['EventCreate'];
type EventUpdateInput = components['schemas']['EventUpdate'];
type EventCancelInput = components['schemas']['EventCancel'];

/**
 * @ai-context Events Controller
 * Thin HTTP handlers delegating to services. Start here from routes.
 * @related-files ../routes/events.routes.ts, ../services/events.service.ts
 */

/** POST /events  – create draft event + initial items */
export const createEvent = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });

  // Enforce verified phone before hosting unless bypass in env
  if (process.env.BYPASS_PHONE_VALIDATION !== 'TEST') {
    try {
      const { data: profile } = await (await import('../config/supabaseClient')).supabase
        .from('user_profiles').select('phone_verified').eq('user_id', req.user.id).single();
      if (!profile?.phone_verified) {
        return res.status(403).json({ ok: false, error: 'Phone verification required before hosting', code: 'PHONE_UNVERIFIED' });
      }
    } catch {}
  }

  const payload = req.body as CreateEventInput;

  // Validate event date is in the future
  if (payload.event_date) {
    const eventDate = new Date(payload.event_date);
    const now = new Date();
    
    if (eventDate <= now) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Event date must be in the future', 
        code: '400' 
      });
    }
  }

  const result = await EventService.createEventWithItems(payload, req.user.id);

  // `handle` sends {ok:false} errors with proper status.
  // On success we want 201 Created.
  if (result.ok) return res.status(201).json(result.data);

  return handle(res, result);
};

/** GET /events/:eventId  – full event (items + participants) */
export const getEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  // authGuard guarantees req.user, but double-check:
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  // Extract bearer token exactly once
  const authHeader = req.headers.authorization || '';
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  const result = await EventService.getEventDetails(eventId, jwt);

  if (result.ok) return res.status(200).json(result.data);      // 200 with EventFull
  return handle(res, result);                            // 4xx / 5xx
};
// Validation schema for event search query parameters
const EventSearchQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20).refine(val => val >= 1 && val <= 100, 'Limit must be between 1 and 100'),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0).refine(val => val >= 0, 'Offset must be non-negative'),
  status: z.enum(['draft', 'published', 'cancelled', 'completed']).optional(),
  ownership: z.enum(['all', 'mine', 'invited']).optional(),
  startsAfter: z.string().datetime().optional(),
  startsBefore: z.string().datetime().optional(),
  // Location-based search parameters
  lat: z.string().optional().transform(val => val ? parseFloat(val) : undefined).refine(val => val === undefined || (val >= -90 && val <= 90), 'Invalid latitude'),
  lon: z.string().optional().transform(val => val ? parseFloat(val) : undefined).refine(val => val === undefined || (val >= -180 && val <= 180), 'Invalid longitude'),
  radius_km: z.string().optional().transform(val => val ? parseInt(val) : undefined).refine(val => val === undefined || (val >= 1 && val <= 200), 'Radius must be between 1 and 200 km'),
  near: z.string().optional(),
  q: z.string().optional(),
  diet: z.string().optional(),
  is_public: z.string().optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined),
  // Include related data
  include: z.string().optional()
});

/** GET /events  – list events the caller can see (host or participant) */
export const listEvents = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  try {
    /*── Query-param parsing and validation ─────────────────────────────*/
    const params = EventSearchQuerySchema.parse(req.query);
    
    // Debug logging for include parameter
    console.log('🔍 Events controller - parsed params:', JSON.stringify(params, null, 2));
    require('fs').appendFileSync('debug.log', `🔍 Events controller - parsed params: ${JSON.stringify(params, null, 2)}\n`);

    /*── Service call ──────────────────────────────────────────────────────────*/
    const result = await EventService.listEvents(req.user.id, params);

    /*── Respond ───────────────────────────────────────────────────────────────*/
    if (result.ok) return res.status(200).json(result.data);      // 200 with EventFull

    return handle(res, result);                    // 400 / 403 etc. via helper

  } catch (error) {
    if (error instanceof z.ZodError) {
      log('Validation error in listEvents:', error.issues);
      return res.status(400).json({ 
        ok: false,
        error: 'Invalid query parameters', 
        details: error.issues 
      });
    }
    
    log('Error in listEvents:', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
};

/** PATCH /events/:eventId  – host edits title / dates / location etc. */
export const updateEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  const payload = req.body as EventUpdateInput;   // body already validated by middleware

  const result = await EventService.updateEventDetails(
    eventId,
    req.user.id,
    payload
  );

  if (result.ok) return res.status(200).json(result.data);      // 200 with EventFull

  return handle(res, result);                     // 400 / 403 / 404 / 409 via helper
};

/** POST /events/:eventId/publish  – transition draft → published */
export const publishEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  const result = await EventService.publishEvent(eventId, req.user.id);
  
  if (result.ok) {
    // Trigger notifications (eligibility is checked inside the service via event status/public)
    try {
      console.log('[Publish] Triggering nearby notifications', {
        eventId,
        title: (result.data as any).event?.title,
        date: (result.data as any).event?.event_date,
        is_public: (result.data as any).event?.is_public
      });
      const notificationResult = await notifyNearbyUsers(
        eventId,
        (result.data as any).event?.title,
        (result.data as any).event?.event_date
      );
      console.log('[Publish] Nearby notifications result', {
        eventId,
        ok: notificationResult.ok,
        notified_count: (notificationResult as any)?.data?.notified_count,
        error: (notificationResult as any)?.error
      });
      if (notificationResult.ok) {
        log(`Sent ${notificationResult.data.notified_count} nearby notifications for event ${eventId}`);
      } else {
        log(`Failed to send notifications for event ${eventId}: ${notificationResult.error}`);
      }
    } catch (error) {
      console.log('[Publish] Error sending notifications', { eventId, error });
      // Don't fail the publish if notifications fail
    }
    
    return res.status(200).json(result.data);      // 200 with EventFull
  }

  return handle(res, result);                       // error → mapped status & JSON
};

/** POST /events/:eventId/cancel  – cancel a published event (requires reason) */
export const cancelEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  const payload = req.body as EventCancelInput;  // { reason: string, notifyGuests?: boolean }

  const result = await EventService.cancelEvent(eventId, req.user.id, payload);

  if (result.ok) return res.status(200).json(result.data);      // 200 with EventFull

  return handle(res, result);                     // error → mapped status & JSON
};


/** POST /events/:eventId/complete  – mark published event as completed */
export const completeEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  const result = await EventService.completeEvent(eventId, req.user.id);

  if (result.ok) return res.status(200).json(result.data);      // 200 with EventFull

  return handle(res, result);                     // error → mapped status & JSON
};

/** DELETE /events/:eventId – hard delete (draft only), otherwise 409 Conflict */
export const deleteEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  const result = await EventService.deleteEvent(eventId, req.user.id);

  if (result.ok) {
    // If you want 204 No Content for deletes (no body):
    return res.status(204).send();
    // Or if you want to return deleted event info:
    // return res.json(result.data);
  }

  return handle(res, result); // error → mapped status & JSON
};

/** POST /events/:eventId/purge – soft delete/purge an event (draft or cancelled only) */
export const purgeEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  const result = await EventService.purgeEvent(eventId, req.user.id);

  // Success: no content
  if (result.ok) return res.status(204).send();

  return handle(res, result);
};

/** POST /events/:eventId/restore – restore a previously purged event */
export const restoreEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  const result = await EventService.restoreEvent(eventId, req.user.id);

  if (result.ok) return res.status(200).json(result.data);      // 200 with EventFull

  return handle(res, result);
};
