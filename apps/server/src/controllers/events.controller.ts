import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authGuard';
import * as EventService from '../services/events.service';
import { components } from '../../../../libs/common/src/types.gen';
import debug from 'debug';
import { handle } from '../utils/helper';          // httpStatus + JSON wrapper

const log = debug('potluck:events');
log('Debug namespace is Event Controller');

type CreateEventInput  = components['schemas']['EventCreate'];
type EventUpdateInput = components['schemas']['EventUpdate'];
type EventCancelInput = components['schemas']['EventCancel'];


/** POST /events  – create draft event + initial items */
export const createEvent = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });

  const payload = req.body as CreateEventInput;

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

  if (result.ok) return res.json(result.data);           // 200  ✓
  return handle(res, result);                            // 4xx / 5xx
};
/** GET /events  – list events the caller can see (host or participant) */
export const listEvents = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  /*── Query-param parsing (defaults & coercion) ─────────────────────────────*/
  const {
    limit        = '20',
    offset       = '0',
    status,
    startsAfter,
    startsBefore,
  } = req.query as Record<string, string>;

  const params = {
    limit:        Number(limit),
    offset:       Number(offset),
    status:       status as any,         // 'draft' | 'published' | 'cancelled' | 'completed' | undefined
    startsAfter,
    startsBefore,
  };

  /*── Service call ──────────────────────────────────────────────────────────*/
  const result = await EventService.listEvents(req.user.id, params);

  /*── Respond ───────────────────────────────────────────────────────────────*/
  if (result.ok) return res.json(result.data);   // 200 with PaginatedEventSummary

  return handle(res, result);                    // 400 / 403 etc. via helper
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

  if (result.ok) return res.json(result.data);    // 200 OK with updated EventFull

  return handle(res, result);                     // 400 / 403 / 404 / 409 via helper
};

/** POST /events/:eventId/publish  – transition draft → published */
export const publishEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  const result = await EventService.publishEvent(eventId, req.user.id);

  if (result.ok) return res.json(result.data);      // 200 with EventFull

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

  if (result.ok) return res.json(result.data);    // 200 with EventFull

  return handle(res, result);                     // error → mapped status & JSON
};


/** POST /events/:eventId/complete  – mark published event as completed */
export const completeEvent = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;

  if (!req.user?.id) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', code: '401' });
  }

  const result = await EventService.completeEvent(eventId, req.user.id);

  if (result.ok) return res.json(result.data);    // 200 with EventFull

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

  if (result.ok) return res.json(result.data);

  return handle(res, result);
};
