# REST Tests (UI-equivalent)

Purpose
- Validate end-to-end workflows using the exact same public API endpoints the mobile UI calls (no mocks).
- Exercise auth, profile, events, requests, items, participants, rebalance, and billing flows against your live Supabase-backed server.

Prereqs
- Server running (in another terminal):
  - `cd apps/server`
  - `npm run dev`
- Configure env once: `apps/server/.env` (Supabase keys provided) and seed users:
  - `node apps/server/scripts/seed-users.mjs`

Quick start
- Set base URL for tests (defaults to http://localhost:3000/api/v1). The CI workflow also uses this value.
  - `export API_BASE='http://localhost:3000/api/v1'`
- Run individual cases (Node 18+). Each case performs cleanup of all data created by the test user(s):
  - `node tests/rest/cases/auth-and-profile.mjs`
  - `node tests/rest/cases/events-flow.mjs`
  - `node tests/rest/cases/requests-actions.mjs`
- `node tests/rest/cases/participants-and-items.mjs`
- `node tests/rest/cases/items-library.mjs`
- `node tests/rest/cases/items-linking.mjs`
  - `node tests/rest/cases/rebalance.mjs`
  - `node tests/rest/cases/billing-payment-methods.mjs`
  - `node tests/rest/cases/billing-subscriptions.mjs`
  - `node tests/rest/cases/billing-invoices.mjs`

Fixed test users
- HOST: host@test.dev / password123
- PARTICIPANT(GUEST): participant@test.dev / password123

Coverage (endpoint parity with UI)
- Auth/Profile
  - POST `/auth/login`, POST `/user-profile/setup`, GET `/user-profile/me`
- Events
  - POST `/events`, GET `/events`, GET `/events/{id}`, PATCH `/events/{id}`, DELETE `/events/{id}`
  - POST `/events/{id}/publish`, `/cancel`, `/complete`
  - GET `/events/{id}/availability`
- Join Requests
  - POST `/events/{id}/requests`
  - GET `/events/{id}/requests`
  - PATCH `/events/{id}/requests/{requestId}/approve|decline|waitlist|cancel|reorder`
  - POST `/events/{id}/requests/{requestId}/extend`
  - POST `/events/{id}/requests/promote` (optional when available)
- Items
  - GET `/events/{id}/items`
  - POST `/events/{id}/items`
    - Accepts optional `catalog_item_id` or `user_item_id` to link to source
  - PATCH `/events/{id}/items/{itemId}`
  - DELETE `/events/{id}/items/{itemId}`
  - POST `/events/{id}/items/{itemId}/assign`, DELETE `/events/{id}/items/{itemId}/assign`
- Items Library
  - GET `/items/catalog` (global; filtered by `is_active`)
  - GET `/items/me`, POST `/items/me`, PUT `/items/me/{id}`, DELETE `/items/me/{id}`
- Participants
  - POST `/events/{id}/participants`
  - GET `/events/{id}/participants`
  - GET `/events/{id}/participants/{partId}`
  - PUT `/events/{id}/participants/{partId}`
  - DELETE `/events/{id}/participants/{partId}`
  - POST `/events/{id}/participants/{partId}/transfer`
  - POST `/events/{id}/participants/bulk`
  - POST `/events/{id}/participants/{partId}/resend`
- Rebalance
  - POST `/events/{id}/rebalance`
- Billing
  - GET `/billing/plans`
  - POST `/billing/checkout/subscription`
  - GET `/billing/subscriptions`, GET/PUT/DELETE/POST `/billing/subscriptions/{subscriptionId}[ /reactivate ]`
  - GET/POST/PUT/DELETE `/billing/payment-methods[/ {methodId}]`, POST `/billing/payment-methods/{methodId}/set-default`
  - GET `/billing/invoices`, GET `/billing/invoices/{invoiceId}`, GET `/billing/invoices/{invoiceId}/download`

Implemented cases
- `auth-and-profile.mjs`: login → setup profile (if needed) → fetch profile
- `events-flow.mjs`: create → publish → guest join request → host approve → item self-assign → availability
- `requests-actions.mjs`: extend (pending) → decline (pending) → waitlist + reorder → approve → cancel (guest)
- `participants-and-items.mjs`: invite → list items → self-assign → add/update/delete item → list participants
- `rebalance.mjs`: create multi-item event → invite → rebalance unclaimed → validate response
- `billing-subscriptions.mjs`: plans list → checkout start (variant id) → list subscriptions
- `billing-invoices.mjs`: list invoices → get → download
- `billing-payment-methods.mjs`: list → add → get → set default → delete (Note: insert currently returns 500 in live DB; see Notes)
- `items-library.mjs`: catalog list → create user item → list/update/delete my items
- `items-linking.mjs`: create event → add via `catalog_item_id` → add via `user_item_id` → expect 400 if both IDs supplied

Notes / Known Issues
- The Payment Methods case uses `provider=stripe` to align with common provider enums. If your schema is different, update provider or extend the enum.
- Join request flows abide by allowed transitions; declining is done from pending (not from waitlisted).

Troubleshooting
- Ensure server dev logs show `API server is up`. If auth fails, re-run `node scripts/seed-users.mjs`.
- To update OpenAPI -> validators: `npm run schema:generate` (server).
- To change base URL: `export API_BASE='http://<host>:<port>/api/v1'`.

CI / GitHub Actions
- A workflow at `.github/workflows/rest-e2e.yml` builds the server, seeds users, launches the API, and runs all REST cases against a live Supabase project.
- Required repository secrets:
  - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`
  - `LEMONSQUEEZY_API_KEY`, `LEMONSQUEEZY_STORE_ID`, `LEMONSQUEEZY_WEBHOOK_SECRET`
- The workflow starts the API from the compiled output `dist/src/index.js` and hits `/health` before tests.
<<<<<<< Current (Your changes)
=======

Universal/App Links (for share/QR)
- Server exposes a public landing at `GET /events/{eventId}` which renders an HTML deep-link opener.
- Mobile deep link schema: `potluck://event/{eventId}`.
- Configure your public domain and app link hosts:
  - In mobile `app.json`:
    - iOS: `ios.associatedDomains` → `applinks:YOUR_DOMAIN`
    - Android: `android.intentFilters` for `https://YOUR_DOMAIN/events/*`
- Optionally set `PUBLIC_BASE_URL` on the server so the landing page points to the correct canonical domain.
>>>>>>> Incoming (Background Agent changes)
