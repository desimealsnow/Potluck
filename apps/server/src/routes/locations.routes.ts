import { Router } from 'express';
import { addLocation } from '../controllers/locations.controller';
import { validate } from '../middleware/validateSchema';
import { schemas }   from '../validators';  

const router = Router();

router.post('/', validate(schemas.Location), addLocation);

export default router;
