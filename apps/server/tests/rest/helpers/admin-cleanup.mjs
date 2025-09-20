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

if (process.argv[1] && process.argv[1].endsWith('admin-cleanup.mjs') && process.argv[2]) {
  const eventId = process.argv[2];
  hardDeleteEventCascade(eventId).then(() => process.exit(0)).catch(() => process.exit(1));
}