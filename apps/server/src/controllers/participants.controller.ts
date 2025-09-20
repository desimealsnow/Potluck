import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authGuard';
import * as svc from '../services/participants.service';
import { components } from '../../../../libs/common/src/types.gen';
import { handle } from '../utils/helper';          // httpStatus + JSON wrapper
import { transferParticipant } from '../services/participants.transfer.service';

type AddParticipantInput   = components['schemas']['ParticipantAdd'];
type UpdateParticipantInput = components['schemas']['ParticipantUpdate'];
type BulkInviteInput = components['schemas']['ParticipantBulkAdd'];



/* POST /events/:eventId/participants */
export const add = async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.eventId;
  const input   = req.body as AddParticipantInput;

  const result = await svc.addParticipant(eventId, input);
  return handle(res, result, 201);

};

/* GET /events/:eventId/participants */
export const list = async (req: AuthenticatedRequest, res: Response) => {
  const eventId = req.params.eventId;

  const result = await svc.listParticipants(eventId);
  return handle(res, result, 201);


};

/* GET /events/:eventId/participants/:partId */
export const get = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId, partId } = req.params;

  const result = await svc.getParticipant(eventId, partId);
  return handle(res, result, 201);

};

/* PUT /events/:eventId/participants/:partId */
export const update = async (req: AuthenticatedRequest, res: Response) => {
  const partId = req.params.partId;
  const input  = req.body as UpdateParticipantInput;

  const result = await svc.updateParticipant(partId, input);
  return handle(res, result, 201);

};

/* DELETE /events/:eventId/participants/:partId */
export const remove = async (req: AuthenticatedRequest, res: Response) => {
  const partId = req.params.partId;

  const result = await svc.deleteParticipant(partId);
  return handle(res, result, 201);

};

/** POST /events/:eventId/participants/bulk */
export const bulkAdd = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const inputs = (req.body as BulkInviteInput).invites;
  const result = await svc.bulkAddParticipants(req.params.eventId, inputs);
  return handle(res, result, 201);
};

/** POST /events/:eventId/participants/:partId/resend */
export const resendInvite = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const result = await svc.resendInvite(req.params.partId);
  return handle(res, result);
};

/**
 * Transfers a participant from one user to another in a specified event.
 *
 * This function extracts the event ID and participant ID from the request parameters, retrieves the actor's ID from the authenticated user,
 * and gathers the new user ID and carry items from the request body. It then calls the transferParticipant function to perform the transfer
 * and handles the response accordingly.
 *
 * @param req - The authenticated request object containing parameters and body data.
 * @param res - The response object used to send the result back to the client.
 */
export const transfer = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { eventId, partId } = req.params;
  const actorId = req.user!.id;
  const newUserId = (req.body as any)?.new_user_id as string;
  const carryItems = Boolean((req.body as any)?.carry_items);
  const result = await transferParticipant(eventId, partId, actorId, { newUserId, carryItems });
  return handle(res, result);
};