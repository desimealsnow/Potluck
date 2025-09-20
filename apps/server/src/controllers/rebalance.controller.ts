import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authGuard';
import { rebalanceUnassigned } from '../services/rebalance.service';
import { handle } from '../utils/helper';

export const rebalance = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const actorId = req.user!.id;
  const maxPerUser = typeof req.body?.max_per_user === 'number' ? req.body.max_per_user : undefined;

  const result = await rebalanceUnassigned(eventId, actorId, { maxPerUser });
  return handle(res, result);
};


