import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/authGuard';
import { rebalanceUnassigned } from '../services/rebalance.service';
import { handle } from '../utils/helper';

/**
 * Rebalances the unassigned tasks for a specific event.
 *
 * This function retrieves the event ID from the request parameters and the actor ID from the authenticated user.
 * It also checks for a maximum number of tasks per user from the request body.
 * The function then calls `rebalanceUnassigned` with these parameters and handles the response using the `handle` function.
 *
 * @param {AuthenticatedRequest} req - The authenticated request object containing parameters and user information.
 * @param {Response} res - The response object used to send the result back to the client.
 */
export const rebalance = async (req: AuthenticatedRequest, res: Response) => {
  const { eventId } = req.params;
  const actorId = req.user!.id;
  const maxPerUser = typeof req.body?.max_per_user === 'number' ? req.body.max_per_user : undefined;

  const result = await rebalanceUnassigned(eventId, actorId, { maxPerUser });
  return handle(res, result);
};


