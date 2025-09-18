import { Router } from 'express';
import * as C from '../controllers/participants.controller';
import { schemas } from '../validators';  
import { validate } from '../middleware/validateSchema';
import { authGuard } from '../middleware/authGuard';

const router = Router({ mergeParams: true });

// Invite / self-RSVP
router.post(
  '/',
  authGuard,
  validate(schemas.ParticipantAdd),
  C.add
);

// List all participants
router.get(
  '/',
  authGuard,
  C.list
);

// Get a specific participant
router.get(
  '/:partId',
  authGuard,
  C.get
);

// Update RSVP/status or role
router.put(
  '/:partId',
  authGuard,
  validate(schemas.ParticipantUpdate),
  C.update
);

// Remove (kick/leave) a participant
router.delete(
  '/:partId',
  authGuard,
  C.remove
);

// Bulk invite participants
router.post(
  '/bulk',
  authGuard,
  validate(schemas.ParticipantBulkAdd),
  C.bulkAdd
);

// Re-send invite email
router.post(
  '/:partId/resend',
  authGuard,
  C.resendInvite
);

export default router;