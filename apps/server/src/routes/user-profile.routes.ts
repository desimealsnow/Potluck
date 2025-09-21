import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { routeLogger } from '../middleware/logger.middleware';
import * as UserProfileController from '../controllers/user-profile.controller';
import * as PhoneController from '../services/phone.controller';

const router = Router();

/*──────────────────────────────────────────────────────────────
  User Profile Management Routes
──────────────────────────────────────────────────────────────*/

// Complete user profile setup
router.post(
  '/setup',
  authGuard,
  routeLogger('POST /user-profile/setup'),
  UserProfileController.completeProfileSetupController
);

// Get current user profile
router.get(
  '/me',
  authGuard,
  routeLogger('GET /user-profile/me'),
  UserProfileController.getUserProfileController
);

export default router;

// Phone verification
router.post('/phone/send', authGuard, routeLogger('POST /user-profile/phone/send'), PhoneController.sendCode);
router.post('/phone/verify', authGuard, routeLogger('POST /user-profile/phone/verify'), PhoneController.verifyCode);
