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

  // If self-RSVP (user_id matches caller), require verified phone
  if (process.env.BYPASS_PHONE_VALIDATION !== 'TEST') {
    try {
      const actorId = req.user?.id;
      if (actorId && input.user_id === actorId) {
        const { supabase } = await import('../config/supabaseClient');
        const { data: profile } = await supabase.from('user_profiles').select('phone_verified').eq('user_id', actorId).single();
        if (!profile?.phone_verified) {
          return res.status(403).json({ ok: false, error: 'Phone verification required before RSVP', code: 'PHONE_UNVERIFIED' });
        }
      }
    } catch {
      // ignore
    }
  }

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

/** POST /events/:eventId/participants/:partId/transfer */
export const transfer = async (
  req: AuthenticatedRequest,
  res: Response
) => {
  const { eventId, partId } = req.params;
  const actorId = req.user!.id;
  const newUserId = (req.body as { new_user_id?: string })?.new_user_id as string;
  const carryItems = Boolean((req.body as { carry_items?: unknown })?.carry_items);
  const result = await transferParticipant(eventId, partId, actorId, { newUserId, carryItems });
  return handle(res, result);
};