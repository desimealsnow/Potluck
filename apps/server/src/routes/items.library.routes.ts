import { Router } from 'express';
import { authGuard } from '../middleware/authGuard';
import * as C from '../controllers/items.library.controller';

const router = Router();

// Global catalog
router.get('/catalog', authGuard, C.listCatalog);

// User templates
router.get('/me', authGuard, C.listMyItems);
router.post('/me', authGuard, C.createMyItem);
router.put('/me/:id', authGuard, C.updateMyItem);
router.delete('/me/:id', authGuard, C.deleteMyItem);

export default router;

