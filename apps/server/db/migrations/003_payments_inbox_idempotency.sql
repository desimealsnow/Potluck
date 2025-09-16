-- Webhook inbox to dedupe events
create table if not exists webhook_events (
  provider text not null,
  event_id text not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint webhook_events_pk primary key (provider, event_id)
);

-- Idempotency keys for client-command dedupe
create table if not exists idempotency_keys (
  key text primary key,
  result_hash text,
  created_at timestamptz not null default now()
);


