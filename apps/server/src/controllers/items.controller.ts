import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authGuard';
import * as ItemService from '../services/items.service';
import { components } from '../../../../libs/common/src/types.gen';
import { handle } from '../utils/helper';
import logger from '../logger';

type AssignItemInput  = components['schemas']['ItemAssign'];
type ItemCreateInput  = components['schemas']['ItemCreate'];

/** PATCH /events/:eventId/items/:itemId */

export const updateItem = async (req: AuthenticatedRequest, res: Response) => {
  const result = await ItemService.updateItem(
    req.params.eventId,
    req.params.itemId,
    req.user!.id,
    req.body
  );
  return handle(res, result);            // ← one-liner
};

/** POST /events/:eventId/items/:itemId/assign */

export const assignItem = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, itemId } = req.params;
  const actorId              = req.user!.id;

  // body may be empty → self-assign
  const input  = req.body as Partial<AssignItemInput>;
  const target = input.user_id ?? actorId;
  
  logger.debug('assignItem controller', { eventId, itemId, actorId, input, target });

  const result = await ItemService.assignItem(
    eventId,
    itemId,
    actorId,   // who is performing the action
    { targetUserId: target }       // who will be assigned (`null` not allowed here)
  );

  return handle(res, result);   // unified success/error response
};

/** DELETE /events/:eventId/items/:itemId/assign  (unassign) */
export const unassignItem = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, itemId } = req.params;
  const actorId              = req.user!.id;

  logger.debug('unassignItem controller', { eventId, itemId, actorId });

  const result = await ItemService.assignItem(
    eventId,
    itemId,
    actorId,
    { targetUserId: null }          // null ⇒ unassign
  );

  return handle(res, result);
};

/** DELETE /events/:eventId/items/:itemId */
export const deleteItem = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, itemId } = req.params;
  const actorId              = req.user!.id;

  const result = await ItemService.deleteItem(eventId, itemId, actorId);

  return handle(res, result);        // success → 204/200, error → 4xx/5xx
};


/** GET /events/:eventId/items   (list with pagination) */
export const listItems = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const actorId      = req.user!.id;

  const { limit: limitRaw, offset: offsetRaw } = (req.query ?? {}) as Partial<Record<'limit' | 'offset', string | number>>;
  const limit  = typeof limitRaw === 'string' ? parseInt(limitRaw, 10) : (typeof limitRaw === 'number' ? limitRaw : 20);
  const offset = typeof offsetRaw === 'string' ? parseInt(offsetRaw, 10) : (typeof offsetRaw === 'number' ? offsetRaw : 0);

  const result = await ItemService.listItems(eventId, actorId, {
    limit:  Number(limit),
    offset: Number(offset)
  });

  return handle(res, result);
};

/** POST /events/:eventId/items   (add a slot) */
export const addItem = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const actorId      = req.user!.id;
  const payload      = req.body as ItemCreateInput;
  logger.info('HTTP addItem', { eventId, actorId, payload });
  const result = await ItemService.addItem(eventId, payload, actorId);
  if (!result.ok) {
    logger.error('HTTP addItem failed', { eventId, actorId, payload, result });
  } else {
    logger.info('HTTP addItem success', { eventId, actorId, itemId: result.data.id });
  }
  // handle() will send 201 if service sets code='201' or ok:true + res.status(201)
  return handle(res, result);
};

/** GET /events/:eventId/items/:itemId   (fetch one) */
export const getItem = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, itemId } = req.params;
  const actorId              = req.user!.id;

  const result = await ItemService.getItem(eventId, itemId, actorId);

  return handle(res, result);
};