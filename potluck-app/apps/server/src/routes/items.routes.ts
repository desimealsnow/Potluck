import { Router } from 'express';
import * as C from '../controllers/items.controller';
import { validate }  from '../middleware/validateSchema';
import { schemas }   from '../validators';            // Zod generated
import { authGuard } from '../middleware/authGuard';

const router = Router({ mergeParams: true });  // keeps :eventId from parent

// -----------------------------------------------------------------------------
// /events/:eventId/items
// -----------------------------------------------------------------------------
router
  .route('/')                                   // root collection
  .get(authGuard, C.listItems)                  // LIST  items
  .post(                                         // CREATE item
    authGuard,
    validate(schemas.ItemCreate),
    C.addItem
  );

// -----------------------------------------------------------------------------
// /events/:eventId/items/:itemId/assign
// -----------------------------------------------------------------------------
router.post(
  '/:itemId/assign',                            // ASSIGN item
  authGuard,
  validate(schemas.ItemAssign),                 // body may be empty → self-assign
  C.assignItem
);

router.delete(                                   // UNASSIGN item
  '/:itemId/assign',
  authGuard,
  C.unassignItem
);

// -----------------------------------------------------------------------------
// /events/:eventId/items/:itemId
// -----------------------------------------------------------------------------
router
  .route('/:itemId')
  .get(authGuard, C.getItem)                    // GET    single
  .patch(                                        // UPDATE (partial)
    authGuard,
    validate(schemas.ItemUpdate),
    C.updateItem
  )
  .delete(authGuard, C.deleteItem);             // DELETE slot

export default router;
