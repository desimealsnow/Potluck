# Notifications: Data model, APIs, mobile UX

This document describes the notification system added/updated in this repo: schema, server endpoints, mobile UI behavior, and delivery.

## What guests receive
- Invitation received / join request approved/declined
- Event updated (time, venue) / event cancelled
- Reminders (T-48h claim items, T-24h don't forget)
- Item activity (claim accepted/changed, unclaimed items remaining)
- Hold/RSVP status (pending expiring soon → approved)

## Where it shows up
- Mobile (React Native / Expo)
  - Global bell in the header with unread badge
  - Inbox screen with New/Earlier, mark-all-read
  - Context badges on event cards; top banner for high-priority (e.g., cancelled)
  - Ephemeral toasts for immediate feedback
  - Push notifications (optional) via Expo Notifications
- Web (future)
  - Top-nav bell with count and dropdown preview (last 5) → View all
  - /notifications full page
  - Context chips and toasts
  - Web Push (optional) via service-worker + VAPID; fall back to email

## Data model (Postgres / Supabase)
Tables and indexes are created/extended by `apps/server/db/migrations/007_notifications_extend.sql`.

- notifications
  - id (uuid, pk)
  - user_id (uuid, not null)
  - type (text, not null) e.g. invite_received, request_approved, request_declined, event_updated, event_cancelled, reminder, item_unclaimed, item_assigned, item_updated, hold_extended, hold_expiring_soon, hold_expired
  - event_id (uuid, nullable)
  - item_id (uuid, nullable)
  - actor_user_id (uuid, nullable)
  - priority (smallint, default 0; 1=high)
  - payload (jsonb, default '{}') minimal render data
  - delivered_channels (jsonb, default '[]') e.g. ["in_app","push","email"]
  - read_at (timestamptz, nullable)
  - created_at (timestamptz, default now())
  - indexes: (user_id, created_at desc), (user_id, read_at)

- notification_preferences
  - user_id (uuid, pk)
  - push_enabled (bool, default false)
  - email_enabled (bool, default false)
  - in_app_enabled (bool, default true)
  - per-type toggles (invite_received, request_approved, request_declined, event_updated, event_cancelled, reminder, item_unclaimed)
  - updated_at (timestamptz, default now())

- push_tokens
  - id (uuid, pk)
  - user_id (uuid, not null)
  - platform (text: 'ios'|'android'|'web')
  - token (text, unique)
  - created_at (timestamptz, default now())

Row Level Security is applied in the migration file.

## Server endpoints (under /api/v1/discovery)
- GET `/discovery/notifications?limit=&offset=&status=unread|all`
  - Returns paginated inbox items for the authenticated user
  - `status=unread` filters to unread only
- GET `/discovery/notifications/unread-count`
  - Returns `{ count: number }`
- PATCH `/discovery/notifications/:id/read`
  - Marks one notification as read
- PATCH `/discovery/notifications/read-all`
  - Marks all notifications as read for the user
- POST `/discovery/push/register`
  - Body: `{ token: string, platform: 'ios'|'android'|'web' }`
  - Stores/updates the user's push token
- GET `/discovery/me/notification-preferences`
- PUT `/discovery/me/notification-preferences`
  - Upserts the user's preferences

Server implementation highlights
- `apps/server/src/services/notifications.service.ts` contains helpers: createNotification, unread count, query with status filter, and `notifyEventParticipantsCancelled` which inserts high-priority cancellation notifications to event participants.
- Join-request flows in `apps/server/src/modules/requests/requests.service.ts` create requester notifications on approve/decline.
- Push delivery is stubbed in `apps/server/src/services/push.service.ts` (logs intended deliveries and enumerates push tokens); can be swapped for real Expo/web push later.

## Mobile updates
- Header bell badge on `apps/mobile/src/screens/Auth/EventList.tsx` fetches unread count from `/discovery/notifications/unread-count`.
- `apps/mobile/src/screens/Auth/NotificationsScreen.tsx`
  - Fetches with `status=unread` by default
  - Mark-all-read action
  - Supabase Realtime subscription to `public.notifications` inserts to prepend new notifications live
- Push registration
  - Best-effort token registration with `expo-notifications` → calls `/discovery/push/register`

## Migrations and deployment
- Ensure migration `007_notifications_extend.sql` is applied to your Postgres/Supabase database
- Confirm RLS policies align with your auth JWT claims (user_id present)

## Temporary type shims
To keep TypeScript builds green without blocking on upstream typings:
- `apps/server/src/types/zodios-core.d.ts` provides minimal types for `@zodios/core`
- `apps/server/src/types/payments-core.d.ts` includes basic declarations used by billing code
These shims can be removed when proper types are available or if the imports are replaced.

## Notes
- Billing and validators were re-enabled after initial unblock; the quick stub `validators.quick.ts` has been removed.
- Push delivery is not enabled by default; only in-app inbox and counts are active.