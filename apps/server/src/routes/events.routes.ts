import { Router } from 'express';
import { authGuard }   from '../middleware/authGuard';
import { validate }    from '../middleware/validateSchema';
import { routeLogger } from '../middleware/logger.middleware';
import { schemas }     from '../validators';          // generated Zod

// ───── Controllers ───────────────────────────────────────────
import * as E from '../controllers/events.controller';
import * as R from '../modules/requests';
import { RequestsService } from '../modules/requests';
import * as RB from '../controllers/rebalance.controller';

// child routers
import itemsRouter        from './items.routes';
import participantsRouter  from './participants.routes';
import { requestsRoutes } from '../modules/requests';

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

// Host utility: auto-rebalance unassigned items to accepted participants
router.post(
  '/:eventId/rebalance',
  authGuard,
  routeLogger('POST /events/:eventId/rebalance'),
  RB.rebalance
);
/*──────────────────────────────────────────────────────────────
  Nested resources
──────────────────────────────────────────────────────────────*/
router.use('/:eventId/items',        itemsRouter);        // /events/:id/items/…
router.use('/:eventId/participants', participantsRouter); // /events/:id/participants/…
router.use('/:eventId/requests',     requestsRoutes);     // /events/:id/requests/…


/*──────────────────────────────────────────────────────────────
  Availability endpoint (capacity management)
──────────────────────────────────────────────────────────────*/
router.get(
  '/:eventId/availability',
  routeLogger('GET /events/:eventId/availability'),
  R.RequestsController.getEventAvailability
);

// Host-level aggregate: list pending requests across my events
router.get(
  '/requests',
  authGuard,
  routeLogger('GET /events/requests'),
  async (req: any, res) => {
    const userId = req.user!.id;
    // find events where user is host
    const { supabase } = await import('../config/supabaseClient');
    const { data: events, error } = await supabase
      .from('events')
      .select('id')
      .eq('created_by', userId);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    const ids = (events || []).map(e => (e as any).id);
    if (!ids.length) return res.json({ data: [], totalCount: 0, nextOffset: null });

    const { data, error: listErr } = await supabase
      .from('event_join_requests')
      .select('*')
      .in('event_id', ids)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (listErr) return res.status(500).json({ ok: false, error: listErr.message });
    return res.json({ data: data || [], totalCount: (data || []).length, nextOffset: null });
  }
);

export default router;
