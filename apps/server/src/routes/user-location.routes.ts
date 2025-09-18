import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import { routeLogger } from '../middleware/logger.middleware';
import * as UserLocationController from '../controllers/user-location.controller';

const router = Router();

/*──────────────────────────────────────────────────────────────
  User Location Management Routes
──────────────────────────────────────────────────────────────*/

// Get user location profile
router.get(
  '/me/location',
  authGuard,
  routeLogger('GET /user-location/me/location'),
  UserLocationController.getUserLocationController
);

// Update user location
router.patch(
  '/me/location',
  authGuard,
  routeLogger('PATCH /user-location/me/location'),
  UserLocationController.updateUserLocationController
);

// Update discoverability settings
router.patch(
  '/me/discoverability',
  authGuard,
  routeLogger('PATCH /user-location/me/discoverability'),
  UserLocationController.updateDiscoverabilityController
);

// Remove user location
router.delete(
  '/me/location',
  authGuard,
  routeLogger('DELETE /user-location/me/location'),
  UserLocationController.removeUserLocationController
);

// Search cities
router.get(
  '/cities/search',
  authGuard,
  routeLogger('GET /user-location/cities/search'),
  UserLocationController.searchCitiesController
);

export default router;
