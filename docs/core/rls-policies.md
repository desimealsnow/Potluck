# Row‑Level Security (RLS) Policies – Potluck Application

> **Status**: Draft · v0.1 · 27 Jun 2025

---

## 1. Guiding Principles

| Principle                    | Explanation                                                                                                               |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Least privilege**          | Default **deny all**; grant only the operations each role truly needs                                                     |
| **Ownership ≙ `auth.uid()`** | A row is modifiable only by the user that created it (or by hosts/admins where noted)                                     |
| **Tenant isolation**         | No cross‑event leakage; users see only events they host or are invited to, unless the event is flagged `is_public = true` |
| **Edge‑cached helpers**      | Complex visibility checks are wrapped in *stable* SQL functions so policies remain readable & performant                  |
| **Service role bypass**      | `service_role` and database jobs use the built‑in bypass to ignore RLS when necessary                                     |

---

## 2. Roles & Auth Context

| Supabase Role   | Description                                                   |
| --------------- | ------------------------------------------------------------- |
| `anon`          | Unauthenticated client; can view **public** events only       |
| `authenticated` | Regular signed‑in user; limited to rows scoped by policies    |
| `service_role`  | Supabase Edge Functions & server cron tasks; bypasses all RLS |

Supabase injects two helpers into every session:

```sql
-- User ID (UUID) of the JWT
select auth.uid();
-- Supabase role name
select auth.role();
```

---

## 3. Helper Functions

> **File**: `supabase/functions/rls_helpers.sql`

```sql
-- ▲ Returns TRUE if the given event row should be visible to the current user
create or replace function is_event_visible(ev_row events)
returns boolean language sql stable as $$
  select
    ev_row.is_public
    or ev_row.host_id        = auth.uid()
    or exists (
      select 1 from participants p
      where p.event_id = ev_row.id
        and p.user_id = auth.uid()
    );
$$;
```

*(Call helpers from policies to keep expressions short and maintainable.)*

---

## 4. Table‑by‑Table Policies

### 4.1 `public.users`

```sql
alter table public.users enable row level security;

-- 🔒 Default DENY

-- 📖 Read own profile
create policy "Users: select self" on public.users
  for select using (id = auth.uid());

-- ✏️ Update own profile (non‑admin fields only)
create policy "Users: update self" on public.users
  for update using (id = auth.uid());
```

> *Insertion happens via Supabase Auth; deletes are disallowed to preserve referential integrity.*

---

### 4.2 `public.events`

```sql
alter table public.events enable row level security;

-- 🔒 Default DENY

-- 📖 View events you can see
create policy "Events: select visible" on public.events
  for select using (is_event_visible(events));

-- ➕ Create event (you become host)
create policy "Events: insert self host" on public.events
  for insert with check (host_id = auth.uid());

-- ✏️ Host can update
create policy "Events: update host" on public.events
  for update using (host_id = auth.uid());

-- 🗑️ Host can delete
create policy "Events: delete host" on public.events
  for delete using (host_id = auth.uid());
```

---

### 4.3 `public.participants`

```sql
alter table public.participants enable row level security;

-- 🔒 Default DENY

-- 📖 View participation in visible events
create policy "Participants: select" on public.participants
  for select using (
    is_event_visible((select ev from public.events ev where ev.id = participants.event_id))
  );

-- ➕ Host can invite OR user can self‑join public events
create policy "Participants: insert" on public.participants
  for insert with check (
    -- Host invites others
    (auth.uid() = (select ev.host_id from public.events ev where ev.id = participants.event_id))
    -- or self‐registration to a public event
    or (auth.uid() = participants.user_id and
        (select ev.is_public from public.events ev where ev.id = participants.event_id))
  );

-- ✏️ Participant can update own RSVP; host can update anyone
create policy "Participants: update" on public.participants
  for update using (
    auth.uid() = user_id
    or auth.uid() = (select ev.host_id from public.events ev where ev.id = participants.event_id)
  );

-- 🗑️ Host or self‑withdraw
create policy "Participants: delete" on public.participants
  for delete using (
    auth.uid() = user_id
    or auth.uid() = (select ev.host_id from public.events ev where ev.id = participants.event_id)
  );
```

---

### 4.4 `public.items`

```sql
alter table public.items enable row level security;

-- 🔒 Default DENY

-- 📖 See items for visible events
create policy "Items: select" on public.items
  for select using (is_event_visible((select ev from public.events ev where ev.id = items.event_id)));

-- ➕ Participants can add items they bring
create policy "Items: insert" on public.items
  for insert with check (
    brought_by = auth.uid() and
    exists (select 1 from public.participants p where p.event_id = items.event_id and p.user_id = auth.uid())
  );

-- ✏️ Owner or host can update
create policy "Items: update" on public.items
  for update using (
    brought_by = auth.uid() or
    auth.uid() = (select ev.host_id from public.events ev where ev.id = items.event_id)
  );

-- 🗑️ Owner or host can delete
create policy "Items: delete" on public.items
  for delete using (
    brought_by = auth.uid() or
    auth.uid() = (select ev.host_id from public.events ev where ev.id = items.event_id)
  );
```

---

### 4.5 `public.payments` *(Planned)*

```sql
-- TODO: Introduce once Payment Context is active. Likely pattern:
--  • Contributors can view & update their own payment rows
--  • Host can view all rows for an event
--  • Service role inserts settlement records
```

---

## 5. Testing Matrix

| Scenario                                     | Expected | Example                                        |
| -------------------------------------------- | -------- | ---------------------------------------------- |
| Anonymous fetches **public** event           | ✅ rows   | `select * from events where is_public = true;` |
| Anonymous fetches **private** event          | ❌ 0 rows | same query with `is_public = false`            |
| Auth‑user fetches event they host            | ✅        | `auth.uid() = host_id`                         |
| Auth‑user inserts participant in other event | ❌ reject | `insert into participants ...`                 |
| Host removes participant                     | ✅        | `delete from participants ...`                 |

Automate tests with **pg‑tap** in CI (`npm run test:pg`).

---

## 6. Operational Tips

1. **Verify `search_path`** includes `public` so helper functions resolve.
2. Use `explain analyze` on helper functions to watch cost spikes.
3. Schedule a nightly job to flag orphaned participants (user left workspace).
4. Generate ERD & policy diff in docs site via `dbdiagram.io` script.
