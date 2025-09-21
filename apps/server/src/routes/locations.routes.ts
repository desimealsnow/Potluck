import { Router } from 'express';
import { addLocation } from '../controllers/locations.controller';
import { validate } from '../middleware/validateSchema';
import { schemas }   from '../validators';  
import { authGuard } from '../middleware/authGuard';
import { listLocations } from '../controllers/locations.controller';

const router = Router();

router.get('/', authGuard, listLocations);
router.post('/', validate(schemas.Location), addLocation);

export default router;
