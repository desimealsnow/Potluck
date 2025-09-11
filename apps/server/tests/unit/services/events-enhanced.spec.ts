// Converted from Vitest to Jest for consistency with project test runner
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
// Use Jest APIs directly
const mockFn = jest.fn;
import { listEvents } from '../../../src/services/events.service';

// Mock Supabase
const mockSupabase = {
  from: mockFn(() => ({
    select: mockFn(() => ({
      eq: mockFn(() => ({
        order: mockFn(() => ({
          or: mockFn(() => ({
            range: mockFn()
          })),
          range: mockFn(),
          eq: mockFn(() => ({
            range: mockFn()
          })),
          gte: mockFn(() => ({
            range: mockFn()
          })),
          lte: mockFn(() => ({
            range: mockFn()
          })),
        })),
        or: mockFn(() => ({
          range: mockFn()
        })),
        in: mockFn(() => ({
          neq: mockFn(() => ({
            range: mockFn()
          })),
          range: mockFn()
        })),
        range: mockFn(),
        gte: mockFn(() => ({
          range: mockFn()
        })),
        lte: mockFn(() => ({
          range: mockFn()
        })),
      })),
    })),
  }))
} as any;

jest.mock('../../../src/config/supabaseClient', () => ({
  supabase: mockSupabase
}));

// Mock logger
jest.mock('../../../src/logger', () => ({
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

describe('EventsService - Enhanced Search', () => {
  const mockUserId = 'user-123';
  
  const mockEvents = [
    {
      id: 'event-1',
      title: 'Summer BBQ',
      event_date: '2024-07-01T18:00:00Z',
      attendee_count: 8,
      meal_type: 'mixed',
      status: 'published',
    },
    {
      id: 'event-2', 
      title: 'Vegan Potluck',
      event_date: '2024-07-15T19:00:00Z',
      attendee_count: 12,
      meal_type: 'veg',
      status: 'published',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock chain for participant events query
    const mockParticipantSelect = mockFn(() => ({
      eq: mockFn(() => Promise.resolve({
        data: [{ event_id: 'event-1' }], // User participates in event-1
        error: null
      }))
    }));

    // Setup default mock chain for events query  
    const mockEventsSelect = mockFn(() => ({
      order: mockFn(() => ({
        or: mockFn(() => ({
          eq: mockFn(() => ({
            gte: mockFn(() => ({
              lte: mockFn(() => ({
                range: mockFn(() => Promise.resolve({
                  data: mockEvents,
                  error: null,
                  count: 2
                }))
              }))
            }))
          }))
        })),
        range: mockFn(() => Promise.resolve({
          data: mockEvents,
          error: null,
          count: 2
        }))
      }))
    }));

    (mockSupabase.from as any)
      .mockImplementation((table: string) => {
        if (table === 'event_participants') {
          return { select: mockParticipantSelect };
        }
        if (table === 'events') {
          return { select: mockEventsSelect };
        }
        return { select: mockFn() };
      });
  });

  describe('listEvents with enhanced filters', () => {
    it('should apply text search filter (q parameter)', async () => {
      const params = {
        limit: 20,
        offset: 0,
        q: 'BBQ', // Text search
      };

      // Note: The current implementation doesn't have text search in the listEvents function
      // This test documents what should be implemented
      const result = await listEvents(mockUserId, params);

      expect(result.ok).toBe(true);
      // The actual text search filtering would need to be implemented in the service
    });

    it('should apply date range filters', async () => {
      const params = {
        limit: 20,
        offset: 0,
        startsAfter: '2024-07-01T00:00:00Z',
        startsBefore: '2024-07-31T23:59:59Z',
      };

      const result = await listEvents(mockUserId, params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toEqual(mockEvents);
      }
    });

    it('should apply meal type filter', async () => {
      const params = {
        limit: 20,
        offset: 0,
        meal_type: 'veg,mixed', // Comma-separated dietary preferences
      };

      const result = await listEvents(mockUserId, params);

      expect(result.ok).toBe(true);
      // Should filter events by meal_type
    });

    it('should handle ownership filter', async () => {
      const params = {
        limit: 20,
        offset: 0,
        ownership: 'mine', // Only events user created
      };

      const result = await listEvents(mockUserId, params);

      expect(result.ok).toBe(true);
      // Should only return events where created_by = userId
    });

    it('should handle invited filter', async () => {
      const params = {
        limit: 20,
        offset: 0,
        ownership: 'invited', // Only events user is invited to (not hosting)
      };

      const result = await listEvents(mockUserId, params);

      expect(result.ok).toBe(true);
      // Should only return events where user is participant but not host
    });

    it('should handle pagination correctly', async () => {
      const params = {
        limit: 10,
        offset: 20,
      };

      const result = await listEvents(mockUserId, params);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.nextOffset).toBeNull(); // No more pages in mock data
      }
    });

    it('should handle no participant events scenario', async () => {
      // Mock user with no participant events
      const mockEmptyParticipantSelect = mockFn(() => ({
        eq: mockFn(() => Promise.resolve({
          data: [], // No participant events
          error: null
        }))
      }));

      (mockSupabase.from as any)
        .mockImplementation((table: string) => {
          if (table === 'event_participants') {
            return { select: mockEmptyParticipantSelect };
          }
          if (table === 'events') {
            return { 
              select: mockFn(() => ({
                order: mockFn(() => ({
                  eq: mockFn(() => ({ // Only show created events
                    range: mockFn(() => Promise.resolve({
                      data: [],
                      error: null,
                      count: 0
                    }))
                  }))
                }))
              }))
            };
          }
          return { select: mockFn() };
        });

      const result = await listEvents(mockUserId, {});

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items).toEqual([]);
      }
    });

    it('should handle database errors gracefully', async () => {
      const mockErrorSelect = mockFn(() => ({
        eq: mockFn(() => Promise.resolve({
          data: null,
          error: { message: 'Connection timeout' }
        }))
      }));

      (mockSupabase.from as any)
        .mockImplementation((table: string) => {
          if (table === 'event_participants') {
            return { select: mockErrorSelect };
          }
          return { select: mockFn() };
        });

      const result = await listEvents(mockUserId, {});

      expect(result.ok).toBe(false);
      const e = result as any;
      expect(e.error).toBe('Connection timeout');
      expect(e.code).toBe('500');
    });
  });

  describe('Filter combinations', () => {
    it('should apply multiple filters simultaneously', async () => {
      const params = {
        limit: 20,
        offset: 0,
        status: 'published',
        meal_type: 'veg,mixed',
        startsAfter: '2024-07-01T00:00:00Z',
        startsBefore: '2024-08-01T00:00:00Z',
        ownership: 'all',
      };

      const result = await listEvents(mockUserId, params);

      expect(result.ok).toBe(true);
      // All filters should be applied in sequence
    });

    it('should handle edge case with invalid date filters', async () => {
      const params = {
        startsAfter: 'invalid-date',
        startsBefore: 'also-invalid',
      };

      // Service should handle invalid dates gracefully
      const result = await listEvents(mockUserId, params);

      expect(result.ok).toBe(true);
      // Invalid dates should be ignored or cause graceful failure
    });

    it('should include public published events for users with no participation (ownership=all)', async () => {
      // Make participant query return empty
      const mockEmptyParticipantSelect = mockFn(() => ({
        eq: mockFn(() => Promise.resolve({ data: [], error: null }))
      }));

      // Mock events select to simulate OR including is_public = true
      const publicEvents = [
        { id: 'pub-1', title: 'Open Picnic', event_date: '2025-01-02T10:00:00Z', attendee_count: 0, meal_type: 'mixed', status: 'published', created_by: 'someone-else' },
      ];

      const mockEventsSelect = mockFn(() => ({
        order: mockFn(() => ({
          or: mockFn(() => ({
            eq: mockFn(() => ({
              gte: mockFn(() => ({
                lte: mockFn(() => ({
                  range: mockFn(() => Promise.resolve({ data: publicEvents, error: null, count: 1 }))
                }))
              }))
            })),
            range: mockFn(() => Promise.resolve({ data: publicEvents, error: null, count: 1 })),
          })),
          range: mockFn(() => Promise.resolve({ data: publicEvents, error: null, count: 1 }))
        }))
      }));

      (mockSupabase.from as any)
        .mockImplementation((table: string) => {
          if (table === 'event_participants') {
            return { select: mockEmptyParticipantSelect } as any;
          }
          if (table === 'events') {
            return { select: mockEventsSelect } as any;
          }
          return { select: mockFn() } as any;
        });

      const result = await listEvents('new-user', { limit: 10, offset: 0, status: 'published', ownership: 'all' });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.items.length).toBe(1);
        expect(result.data.items[0].id).toBe('pub-1');
      }
    });
  });
});
