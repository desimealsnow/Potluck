## Potluck API Reference

- Base URL: `/api/v1`
- Version: 0.1.0

### Authentication

- Scheme: Bearer JWT in `Authorization` header
- Example: `Authorization: Bearer <token>`
- Protected endpoints return `401` for missing/invalid tokens. Public endpoints: `/auth/login`, `/auth/signup`, `/billing/webhook/stripe`.

### Error format

- Validation: 400 with Zod formatted errors `{ errors: { ... } }`
- Unauthorized: 401 `{ error: string }`
- Forbidden/Not found/Conflict: `{ message, code? }` when defined, otherwise `{ error: string }`
- Global 500: `{ error: 'Internal Server Error' }`

### Health

GET `/health`
- 200: `{ status: 'ok' }`

### Auth

POST `/auth/signup`
- Body: `{ email: string (email), password: string (min 6), displayName?: string }`
- 200: empty
- 400: Validation error

POST `/auth/login`
- Body: `{ email: string (email), password: string }`
- 200: empty
- 401: Invalid credentials

POST `/auth/logout`
- 200: empty

### Locations

POST `/locations`
- Auth required
- Body: `{ name: string, formatted_address?: string, latitude?: number, longitude?: number }`
- 200: empty

GET `/locations`
- Query: `search?: string`
- 200: `Location[]`

### Events

GET `/events`
- Auth required
- Query:
  - `limit?: integer >=1 (default 20)`
  - `offset?: integer >=0 (default 0)`
  - `status?: 'draft'|'published'|'cancelled'|'completed'|'purged'`
  - `startsAfter?: RFC3339 datetime with offset`
  - `startsBefore?: RFC3339 datetime with offset`
- 200: `PaginatedEventSummary`
- 401

POST `/events`
- Auth required
- Body `EventCreate`:
  - `title: string`
  - `description?: string`
  - `event_date: RFC3339 datetime with offset`
  - `min_guests: integer >=1`
  - `max_guests?: integer`
  - `status?: enum`
  - `meal_type: 'veg'|'nonveg'|'mixed'`
  - `location: Location`
  - `items: ItemCreate[]`
- 200: `EventWithItems`
- 401, 403

GET `/events/:eventId`
- Auth required
- Path: `eventId: uuid`
- 200: `EventFull`
- 401, 403, 404

PATCH `/events/:eventId`
- Auth required
- Path: `eventId`
- Body: `EventUpdate` (same shape as `EventCreate`)
- 200: `EventFull`
- 401, 403, 404, 409

DELETE `/events/:eventId`
- Auth required
- Path: `eventId`
- 204: No Content
- 401, 403, 404, 409

POST `/events/:eventId/publish`
- Auth required
- 200: `EventFull`
- 401, 403, 404, 409

POST `/events/:eventId/cancel`
- Auth required
- Body: `{ reason: string (3..255), notifyGuests?: boolean=true }`
- 200: `EventFull`
- 401, 403, 404, 409

POST `/events/:eventId/complete`
- Auth required
- 200: `EventFull`
- 401, 403, 404, 409

POST `/events/:eventId/purge`
- Auth required
- 200: empty

POST `/events/:eventId/restore`
- Auth required
- 200: empty

### Items (nested under an event)

GET `/events/:eventId/items`
- Auth required
- 200: `Item`
- 401, 403, 404

POST `/events/:eventId/items`
- Auth required
- Body: `Item`
- 200: `ItemCreate`
- 401, 403, 404, 409

GET `/events/:eventId/items/:itemId`
- Auth required
- 200: `Item`

PUT `/events/:eventId/items/:itemId`
- Auth required
- Body: `ItemUpdate`
- 200: empty

DELETE `/events/:eventId/items/:itemId`
- Auth required
- 200: empty

POST `/events/:eventId/items/:itemId/assign`
- Auth required
- Body: `{ user_id?: uuid }` (omit to self-assign)
- 200: empty

DELETE `/events/:eventId/items/:itemId/assign`
- Auth required
- 200: empty

### Participants (nested under an event)

POST `/events/:eventId/participants`
- Auth required
- Body: `ParticipantAdd`
- 200: empty
- 400, 401, 403, 404, 409

GET `/events/:eventId/participants`
- Auth required
- 200: `Participant[]`
- 401, 404

GET `/events/:eventId/participants/:partId`
- Auth required
- 200: `Participant`
- 401, 403, 404

PUT `/events/:eventId/participants/:partId`
- Auth required
- Body: `ParticipantUpdate`
- 200: `Participant`
- 401, 403, 404, 409

DELETE `/events/:eventId/participants/:partId`
- Auth required
- 200: empty
- 401, 403, 404

POST `/events/:eventId/participants/:partId/resend`
- Auth required
- 200: empty
- 401, 403, 404

POST `/events/:eventId/participants/bulk`
- Auth required
- Body: `{ invites: ParticipantAdd[] }`
- 200: empty
- 400, 401, 403, 404, 409

### Billing

GET `/billing/plans`
- 200: `BillingPlan[]`

GET `/billing/subscriptions`
- 200: `Subscription[]`

POST `/billing/checkout/subscription`
- Body: `{ plan_id: string }`
- 200: `{ checkout_url: string (url) }`

POST `/billing/webhook/stripe`
- Public endpoint
- 200: empty

### Schemas (summary)

- `Location`: `{ name, formatted_address?, latitude?, longitude? }`
- `ItemCreate`: `{ name, category?, per_guest_qty>=0.01 }`
- `Item`: `ItemCreate & { id: uuid, required_qty: number, assigned_to?: string|null }`
- `EventBase`: `{ title, description?, event_date, min_guests>=1, max_guests?, status?, meal_type, location }`
- `EventCreate`: `EventBase & { items: ItemCreate[] }`
- `EventCore`: `EventBase & { id: uuid, attendee_count: int, created_by: uuid }`
- `ParticipantAdd`: `{ user_id: uuid, status? enum }`
- `Participant`: `ParticipantAdd & { id: uuid, joined_at: datetime } (partial)`
- `EventFull`: `{ event: EventCore, items: Item[], participants: Participant[] }`
- `EventCancel`: `{ reason: 3..255, notifyGuests?: boolean }`
- `ParticipantUpdate`: `{ status: enum }`
- `PaginatedEventSummary`: `{ data: EventSummary[], nextOffset: int, totalCount: int } (partial)`

### Curl examples

- Create event
```bash
curl -X POST "$BASE/api/v1/events" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"BBQ Night",
    "event_date":"2025-08-28T18:00:00Z",
    "min_guests":5,
    "meal_type":"mixed",
    "location": {"name":"Central Park"},
    "items":[{"name":"Burgers","per_guest_qty":1}]
  }'
```

- List my events
```bash
curl -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/events?limit=20&offset=0"
```

- Add participant
```bash
curl -X POST "$BASE/api/v1/events/$EVENT_ID/participants" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"00000000-0000-0000-0000-000000000000"}'
```

### Environment variables

- `PORT` (default 3000)
- `NODE_ENV` (development|test|production)
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (or test variants)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `APP_URL` (used in emails)
- `LOG_LEVEL`
