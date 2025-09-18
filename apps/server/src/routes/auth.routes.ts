import { Router } from 'express';
import { signup, login, logout } from '../controllers/auth.controller';
import { validate } from '../middleware/validateSchema';
import { schemas }        from '../validators';  

const router = Router();

router.post('/signup', validate(schemas.SignUp), signup);
router.post('/login',  validate(schemas.Login),  login);
router.post('/logout', logout);                // token in Authorization header

export default router;
