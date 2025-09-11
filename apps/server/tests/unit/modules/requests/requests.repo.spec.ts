import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { RequestsRepository } from '../../../../src/modules/requests/requests.repo';
import type { 
  JoinRequestRow, 
  AvailabilityRow,
  ListRequestsQueryType 
} from '../../../../src/modules/requests/requests.types';

// Mock Supabase client
const mockSupabase = {
  rpc: vi.fn(),
  from: vi.fn(() => ({
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        order: vi.fn(() => ({
          range: vi.fn()
        }))
      })),
      order: vi.fn(() => ({
        range: vi.fn()
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    })),
    delete: vi.fn(() => ({
      neq: vi.fn()
    }))
  }))
};

vi.mock('../../../../src/config/supabaseClient', () => ({
  supabase: mockSupabase
}));

// Mock logger
vi.mock('../../../../src/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }
}));

describe('RequestsRepository', () => {
  const mockEventId = 'event-123';
  const mockUserId = 'user-456';  
  const mockRequestId = 'request-789';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getEventAvailability', () => {
    it('should return availability data successfully', async () => {
      const mockAvailabilityData = [{
        total: 20,
        confirmed: 5, 
        held: 3,
        available: 12
      }];

      (mockSupabase.rpc as MockedFunction<any>).mockResolvedValue({
        data: mockAvailabilityData,
        error: null
      });

      const result = await RequestsRepository.getEventAvailability(mockEventId);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toEqual(mockAvailabilityData[0]);
      }
      expect(mockSupabase.rpc).toHaveBeenCalledWith('availability_for_event', {
        event_uuid: mockEventId
      });
    });

    it('should handle database errors', async () => {
      (mockSupabase.rpc as MockedFunction<any>).mockResolvedValue({
        data: null,
        error: { message: 'Function not found', code: '42883' }
      });

      const result = await RequestsRepository.getEventAvailability(mockEventId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Function not found');
        expect(result.code).toBe('500');
      }
    });

    it('should handle empty results', async () => {
      (mockSupabase.rpc as MockedFunction<any>).mockResolvedValue({
        data: [],
        error: null
      });

      const result = await RequestsRepository.getEventAvailability(mockEventId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Event not found');
        expect(result.code).toBe('404');
      }
    });

    it('should handle exceptions gracefully', async () => {
      (mockSupabase.rpc as MockedFunction<any>).mockRejectedValue(new Error('Network error'));

      const result = await RequestsRepository.getEventAvailability(mockEventId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Failed to get availability');
        expect(result.code).toBe('500');
      }
    });
  });

  describe('createRequest', () => {
    const mockRequestRow: JoinRequestRow = {
      id: mockRequestId,
      event_id: mockEventId,
      user_id: mockUserId,
      party_size: 2,
      note: 'Test note',
      status: 'pending',
      hold_expires_at: '2024-01-01T12:30:00Z',
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    };

    it('should create request successfully', async () => {
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockRequestRow,
            error: null
          })
        }))
      }));

      const mockFrom = vi.fn(() => ({
        insert: mockInsert
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        insert: mockInsert
      });

      mockInsert().select().single.mockResolvedValue({
        data: mockRequestRow,
        error: null
      });

      const result = await RequestsRepository.createRequest(
        mockEventId,
        mockUserId,
        2,
        'Test note',
        30
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.id).toBe(mockRequestId);
        expect(result.data.party_size).toBe(2);
        expect(result.data.status).toBe('pending');
      }
    });

    it('should handle unique constraint violations', async () => {
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key value violates unique constraint' }
          })
        }))
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        insert: mockInsert
      });

      const result = await RequestsRepository.createRequest(
        mockEventId,
        mockUserId,
        2,
        'Test note',
        30
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Already have a pending request for this event');
        expect(result.code).toBe('409');
      }
    });

    it('should calculate hold expiration correctly', async () => {
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockImplementation((insertData) => {
            expect(insertData).toMatchObject({
              event_id: mockEventId,
              user_id: mockUserId,
              party_size: 2,
              note: 'Test note',
              status: 'pending'
            });
            
            // Verify hold expiration is approximately 30 minutes from now
            const holdExpiry = new Date(insertData.hold_expires_at);
            const expectedExpiry = new Date(Date.now() + 30 * 60 * 1000);
            const timeDiff = Math.abs(holdExpiry.getTime() - expectedExpiry.getTime());
            expect(timeDiff).toBeLessThan(5000); // Within 5 seconds

            return Promise.resolve({
              data: { ...mockRequestRow, ...insertData },
              error: null
            });
          })
        }))
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        insert: mockInsert
      });

      await RequestsRepository.createRequest(
        mockEventId,
        mockUserId,
        2,
        'Test note',
        30
      );
    });
  });

  describe('listEventRequests', () => {
    const mockQuery: ListRequestsQueryType = {
      limit: 10,
      offset: 0,
      status: 'pending'
    };

    const mockRequests: JoinRequestRow[] = [
      {
        id: 'req-1',
        event_id: mockEventId,
        user_id: 'user-1',
        party_size: 2,
        note: null,
        status: 'pending',
        hold_expires_at: '2024-01-01T12:30:00Z',
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z'
      },
      {
        id: 'req-2', 
        event_id: mockEventId,
        user_id: 'user-2',
        party_size: 1,
        note: 'Looking forward to it!',
        status: 'pending',
        hold_expires_at: '2024-01-01T12:30:00Z', 
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:00:00Z'
      }
    ];

    it('should list requests with pagination', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            eq: vi.fn(() => ({
              range: vi.fn().mockResolvedValue({
                data: mockRequests,
                error: null,
                count: 2
              })
            })),
            range: vi.fn().mockResolvedValue({
              data: mockRequests,
              error: null,
              count: 2  
            })
          }))
        }))
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        select: mockSelect
      });

      const result = await RequestsRepository.listEventRequests(mockEventId, mockQuery);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.data).toHaveLength(2);
        expect(result.data.totalCount).toBe(2);
        expect(result.data.nextOffset).toBeNull();
      }
    });

    it('should apply status filter', async () => {
      const mockOrder = vi.fn(() => ({
        range: vi.fn().mockResolvedValue({
          data: mockRequests.filter(r => r.status === 'pending'),
          error: null,
          count: 2
        })
      }));

      const mockEq2 = vi.fn(() => ({
        range: vi.fn().mockResolvedValue({
          data: mockRequests.filter(r => r.status === 'pending'),
          error: null,
          count: 2
        })
      }));

      const mockEq1 = vi.fn(() => ({
        order: vi.fn(() => ({
          eq: mockEq2
        }))
      }));

      const mockSelect = vi.fn(() => ({
        eq: mockEq1
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        select: mockSelect
      });

      const result = await RequestsRepository.listEventRequests(mockEventId, mockQuery);

      expect(result.ok).toBe(true);
    });

    it('should calculate nextOffset correctly', async () => {
      const queryWithMoreResults = { ...mockQuery, limit: 1, offset: 0 };
      
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            eq: vi.fn(() => ({
              range: vi.fn().mockResolvedValue({
                data: [mockRequests[0]], // Only first item
                error: null,
                count: 2 // But total count is 2
              })
            }))
          }))
        }))
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        select: mockSelect
      });

      const result = await RequestsRepository.listEventRequests(mockEventId, queryWithMoreResults);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.nextOffset).toBe(1); // Should have next page
      }
    });
  });

  describe('updateRequestStatus', () => {
    it('should update status using stored procedure', async () => {
      const mockUpdatedRequest: JoinRequestRow = {
        id: mockRequestId,
        event_id: mockEventId,
        user_id: mockUserId,
        party_size: 2,
        note: null,
        status: 'approved',
        hold_expires_at: null,
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:05:00Z'
      };

      (mockSupabase.rpc as MockedFunction<any>).mockResolvedValue({
        data: mockUpdatedRequest,
        error: null
      });

      const result = await RequestsRepository.updateRequestStatus(
        mockRequestId,
        'approved',
        'pending'
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.status).toBe('approved');
      }

      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_request_status', {
        request_id: mockRequestId,
        new_status: 'approved',
        expected_status: 'pending'
      });
    });

    it('should handle capacity errors', async () => {
      (mockSupabase.rpc as MockedFunction<any>).mockResolvedValue({
        data: null,
        error: { message: 'Insufficient capacity: need 2, have 1' }
      });

      const result = await RequestsRepository.updateRequestStatus(
        mockRequestId,
        'approved',
        'pending'  
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Insufficient capacity');
        expect(result.code).toBe('409');
      }
    });

    it('should handle invalid status transitions', async () => {
      (mockSupabase.rpc as MockedFunction<any>).mockResolvedValue({
        data: null,
        error: { message: 'Invalid status transition: expected pending, got approved' }
      });

      const result = await RequestsRepository.updateRequestStatus(
        mockRequestId,
        'declined',
        'pending'
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Invalid status transition');
        expect(result.code).toBe('409');
      }
    });
  });

  describe('hasExistingRequest', () => {
    it('should return true when pending request exists', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 'existing-request' },
                error: null
              })
            }))
          }))
        }))
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        select: mockSelect
      });

      const result = await RequestsRepository.hasExistingRequest(mockEventId, mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when no pending request exists', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }))
          }))
        }))
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        select: mockSelect
      });

      const result = await RequestsRepository.hasExistingRequest(mockEventId, mockUserId);

      expect(result).toBe(false);
    });

    it('should return false on database errors', async () => {
      const mockSelect = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Connection error' }
              })
            }))
          }))
        }))
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        select: mockSelect
      });

      const result = await RequestsRepository.hasExistingRequest(mockEventId, mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('extendHold', () => {
    it('should extend hold expiration successfully', async () => {
      const mockExtendedRequest: JoinRequestRow = {
        id: mockRequestId,
        event_id: mockEventId,
        user_id: mockUserId,
        party_size: 2,
        note: null,
        status: 'pending',
        hold_expires_at: '2024-01-01T13:00:00Z', // Extended time
        created_at: '2024-01-01T12:00:00Z',
        updated_at: '2024-01-01T12:30:00Z'
      };

      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: mockExtendedRequest,
                error: null
              })
            }))
          }))
        }))
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        update: mockUpdate
      });

      const result = await RequestsRepository.extendHold(mockRequestId, 60);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.hold_expires_at).toBe('2024-01-01T13:00:00Z');
      }
    });

    it('should handle non-existent or non-pending requests', async () => {
      const mockUpdate = vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }))
          }))
        }))
      }));

      (mockSupabase.from as MockedFunction<any>).mockReturnValue({
        update: mockUpdate
      });

      const result = await RequestsRepository.extendHold(mockRequestId, 60);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('Request not found or not pending');
        expect(result.code).toBe('404');
      }
    });
  });
});
