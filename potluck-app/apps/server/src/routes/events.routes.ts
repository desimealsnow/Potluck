import { Router } from 'express';
import { authGuard }   from '../middleware/authGuard';
import { validate }    from '../middleware/validateSchema';
import { routeLogger } from '../middleware/logger.middleware';
import { schemas }     from '../validators';          // generated Zod

// ───── Controllers ───────────────────────────────────────────
import * as E from '../controllers/events.controller';

// child routers
import itemsRouter        from './items.routes';
import participantsRouter  from './participants.routes';

// use mergeParams so :eventId propagates to children
const router = Router({ mergeParams: true });

/*──────────────────────────────────────────────────────────────
  /events  (collection)
──────────────────────────────────────────────────────────────*/
router
  .route('/')
  .get(
    authGuard,
    routeLogger('GET /events'),
    /* optional: validateQuery(schemas.EventsListQuery) */
    E.listEvents
  )
  .post(
    authGuard,
    validate(schemas.EventCreate),          // body
    routeLogger('POST /events'),
    E.createEvent
  );

/*──────────────────────────────────────────────────────────────
  /events/:eventId  (single resource)
──────────────────────────────────────────────────────────────*/
router
  .route('/:eventId')
  .get(
    authGuard,
    validate(schemas.EventIdParam),              // `{ eventId: uuid }`
    routeLogger('GET /events/:eventId'),
    E.getEvent
  )
  .patch(
    authGuard,
    validate(schemas.EventUpdate),
    routeLogger('PATCH /events/:eventId'),
    E.updateEvent
  )
  .delete(
    authGuard,
    routeLogger('DELETE /events/:eventId'),
    E.deleteEvent                           // hard-delete (draft only) / 409 otherwise
  );

/*──────────────────────────────────────────────────────────────
  Lifecycle helpers
──────────────────────────────────────────────────────────────*/
router.post(
  '/:eventId/publish',
  authGuard,
  routeLogger('POST /events/:eventId/publish'),
  E.publishEvent
);

router.post(
  '/:eventId/cancel',
  authGuard,
  validate(schemas.EventCancel),            // body { reason, notifyGuests? }
  routeLogger('POST /events/:eventId/cancel'),
  E.cancelEvent
);

router.post(
  '/:eventId/complete',
  authGuard,
  routeLogger('POST /events/:eventId/complete'),
  E.completeEvent
);

// Soft delete (purge) endpoint
router.post(
  '/:eventId/purge',
  authGuard,
  routeLogger('POST /events/:eventId/purge'),
  E.purgeEvent
);

router.post(
  '/:eventId/restore',
  authGuard,
  routeLogger('POST /events/:eventId/restore'),
  E.restoreEvent
);
/*──────────────────────────────────────────────────────────────
  Nested resources
──────────────────────────────────────────────────────────────*/
router.use('/:eventId/items',        itemsRouter);        // /events/:id/items/…
router.use('/:eventId/participants', participantsRouter); // /events/:id/participants/…

export default router;
