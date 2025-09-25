import { apiClient } from '@/services/apiClient';
import type { Diet, Ownership, EventItem, EventsQuery } from '@common/types';

export type Nearby = { lat: number; lon: number; radius_km?: number } | null;

export async function fetchEvents(q: EventsQuery & { nearby?: Nearby }): Promise<{ items: EventItem[]; hasMore: boolean; points: Array<{ id: string; lat: number; lon: number; title?: string }> }> {
  const params = new URLSearchParams();
  params.set('limit', String(q.limit));
  params.set('offset', String((q.page - 1) * q.limit));
  if (q.q) params.set('q', q.q);

  if (q.status) {
    const statusMap: Record<string, string> = {
      upcoming: 'published',
      past: 'completed',
      drafts: 'draft',
      deleted: 'cancelled',
    };
    params.set('status', statusMap[q.status] || q.status);
    if (q.status === 'drafts' || q.status === 'deleted') {
      params.set('ownership', 'mine');
    }
  }
  if (q.ownership && q.status !== 'drafts') params.set('ownership', q.ownership);
  if (q.diet && q.diet.length) params.set('meal_type', q.diet.join(','));

  if (q.nearby && q.nearby?.lat && q.nearby?.lon) {
    params.set('is_public', 'true');
    params.set('lat', String(q.nearby.lat));
    params.set('lon', String(q.nearby.lon));
    if (q.nearby.radius_km) params.set('radius_km', String(q.nearby.radius_km));
    params.set('status', 'published');
    params.set('ownership', 'all');
  }

  const data = await apiClient.get<any>(`/events?${params.toString()}`);

  const itemsRaw = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  const totalCount = typeof data.totalCount === 'number' ? data.totalCount : undefined;
  const nextOffset = data.nextOffset ?? null;
  const hasMore = nextOffset !== null || (typeof totalCount === 'number' ? (q.page * q.limit) < totalCount : itemsRaw.length === q.limit);

  const items: EventItem[] = itemsRaw.map((e: any) => {
    const ownershipFromApi = e.ownership as Ownership | undefined;
    return {
      id: e.id,
      title: e.title || e.name || 'Untitled Event',
      date: e.event_date || e.date || new Date().toISOString(),
      time: undefined,
      venue: e.location?.name || e.location?.formatted_address || e.venue || e.address || (e.location_id ? 'Location details loading...' : 'Location not specified'),
      attendeeCount: e.attendeeCount ?? e.participants_count ?? 0,
      diet: (e.meal_type as Diet) || 'mixed',
      statusBadge: e.status === 'purged' ? 'deleted' : e.status === 'completed' ? 'past' : e.status === 'cancelled' ? 'cancelled' : e.status === 'draft' ? 'draft' : 'active',
      ownership: ownershipFromApi,
      actualStatus: e.status,
      attendeesPreview: (e.attendees_preview || []).slice(0, 3).map((p: any, idx: number) => ({
        id: p.id || String(idx),
        name: p.name || p.email || 'Guest',
        avatarUrl: p.avatar_url || p.avatarUrl,
      })),
    };
  });

  const points: Array<{ id: string; lat: number; lon: number; title?: string }> = [];
  for (const e of itemsRaw) {
    const lat = typeof e?.location?.latitude === 'number' ? e.location.latitude : undefined;
    const lon = typeof e?.location?.longitude === 'number' ? e.location.longitude : undefined;
    if (typeof lat === 'number' && typeof lon === 'number') {
      points.push({ id: e.id, lat, lon, title: e.title || e.name });
    }
  }

  return { items, hasMore, points };
}

