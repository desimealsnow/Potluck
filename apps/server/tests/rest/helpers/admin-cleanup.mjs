#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(url, serviceKey);

export async function hardDeleteEventCascade(eventId) {
  // Fetch event to capture location_id for potential cleanup
  let locationId = null;
  try {
    const { data: ev } = await admin
      .from('events')
      .select('id, location_id')
      .eq('id', eventId)
      .maybeSingle();
    locationId = ev?.location_id ?? null;
  } catch {}

  // Best-effort cascade deletes for test cleanup
  try { await admin.from('event_items').delete().eq('event_id', eventId); } catch {}
  try { await admin.from('event_participants').delete().eq('event_id', eventId); } catch {}
  try { await admin.from('event_join_requests').delete().eq('event_id', eventId); } catch {}
  try { await admin.from('events').delete().eq('id', eventId); } catch {}

  // If the event's location is now unused, remove it to avoid orphans
  if (locationId) {
    try {
      const { count } = await admin
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locationId);
      if (!count) {
        await admin.from('locations').delete().eq('id', locationId);
      }
    } catch {}
  }
}

export async function hardDeleteByCreator(userId) {
  // 1) Collect all events created by user
  const { data: events } = await admin
    .from('events')
    .select('id, location_id')
    .eq('created_by', userId);
  const eventIds = (events || []).map(e => e.id);
  const locationIds = Array.from(new Set((events || []).map(e => e.location_id).filter(Boolean)));

  if (eventIds.length) {
    // 2) Delete dependent rows by event_id
    try { await admin.from('event_items').delete().in('event_id', eventIds); } catch {}
    try { await admin.from('event_participants').delete().in('event_id', eventIds); } catch {}
    try { await admin.from('event_join_requests').delete().in('event_id', eventIds); } catch {}
    // 3) Delete events
    try { await admin.from('events').delete().eq('created_by', userId); } catch {}
  }

  // 4) Remove orphaned locations referenced by those events (if unused now)
  for (const locId of locationIds) {
    try {
      const { count } = await admin
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('location_id', locId);
      if (!count) {
        await admin.from('locations').delete().eq('id', locId);
      }
    } catch {}
  }

  // 5) Billing artifacts owned by this user
  try { await admin.from('payment_methods').delete().eq('user_id', userId); } catch {}
  try { await admin.from('user_subscriptions').delete().eq('user_id', userId); } catch {}
  try { await admin.from('invoices').delete().eq('user_id', userId); } catch {}
}

function parseArgs(argv) {
  const args = { userId: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--user-id' && argv[i+1]) { args.userId = argv[++i]; continue; }
  }
  return args;
}

if (process.argv[1] && process.argv[1].endsWith('admin-cleanup.mjs')) {
  const { userId } = parseArgs(process.argv);
  if (userId) {
    hardDeleteByCreator(userId).then(() => process.exit(0)).catch(() => process.exit(1));
  } else if (process.argv[2] && /^[0-9a-fA-F-]{36}$/.test(process.argv[2])) {
    // Back-compat: allow calling with just an eventId positional arg
    const eventId = process.argv[2];
    hardDeleteEventCascade(eventId).then(() => process.exit(0)).catch(() => process.exit(1));
  } else {
    console.error('Usage: node admin-cleanup.mjs --user-id <uuid>  (or pass an eventId positional to delete a single event)');
    process.exit(2);
  }
}