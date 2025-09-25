export type EventListItem = {
  id: string;
  title: string;
  date: string;
  time?: string;
  venue?: string;
  attendeeCount: number;
  statusBadge: 'active' | 'past' | 'draft' | 'cancelled' | 'deleted';
};

export type MapPoint = { id: string; lat: number; lon: number; title?: string };

