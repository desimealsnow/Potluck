import { describe, it, expect } from 'vitest';
import {
  JoinRequestStatus,
  JoinRequestAdd,
  JoinRequest,
  PaginatedJoinRequests,
  Availability,
  EventIdParam,
  RequestIdParam,
  EventRequestParams,
  ListRequestsQuery,
  JoinRequestConfig
} from '../../../../src/modules/requests/requests.schema';

describe('RequestsSchema', () => {
  describe('JoinRequestStatus', () => {
    it('should accept valid status values', () => {
      const validStatuses = ['pending', 'approved', 'declined', 'waitlisted', 'expired', 'cancelled'];
      
      validStatuses.forEach(status => {
        const result = JoinRequestStatus.safeParse(status);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(status);
        }
      });
    });

    it('should reject invalid status values', () => {
      const invalidStatuses = ['unknown', 'processing', '', null, undefined, 123];
      
      invalidStatuses.forEach(status => {
        const result = JoinRequestStatus.safeParse(status);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('JoinRequestAdd', () => {
    it('should accept valid join request data', () => {
      const validData = {
        party_size: 2,
        note: 'Looking forward to the event!'
      };

      const result = JoinRequestAdd.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.party_size).toBe(2);
        expect(result.data.note).toBe('Looking forward to the event!');
      }
    });

    it('should accept minimum valid party size', () => {
      const validData = { party_size: 1 };
      
      const result = JoinRequestAdd.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should make note optional', () => {
      const validData = { party_size: 3 };
      
      const result = JoinRequestAdd.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.note).toBeUndefined();
      }
    });

    it('should reject invalid party sizes', () => {
      const invalidSizes = [0, -1, 0.5, 'two', null];
      
      invalidSizes.forEach(size => {
        const result = JoinRequestAdd.safeParse({ party_size: size });
        expect(result.success).toBe(false);
      });
    });

    it('should reject party size exceeding integer limits', () => {
      const result = JoinRequestAdd.safeParse({ party_size: 2.5 });
      expect(result.success).toBe(false);
    });

    it('should reject note that\'s too long', () => {
      const longNote = 'a'.repeat(501); // Exceeds 500 char limit
      const result = JoinRequestAdd.safeParse({ 
        party_size: 1, 
        note: longNote 
      });
      expect(result.success).toBe(false);
    });

    it('should accept note at maximum length', () => {
      const maxNote = 'a'.repeat(500); // Exactly 500 chars
      const result = JoinRequestAdd.safeParse({ 
        party_size: 1, 
        note: maxNote 
      });
      expect(result.success).toBe(true);
    });

    it('should reject extra properties due to strict mode', () => {
      const dataWithExtra = {
        party_size: 2,
        note: 'Valid note',
        extraField: 'should be rejected'
      };

      const result = JoinRequestAdd.safeParse(dataWithExtra);
      expect(result.success).toBe(false);
    });
  });

  describe('JoinRequest', () => {
    const baseRequest = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      event_id: '123e4567-e89b-12d3-a456-426614174001',
      user_id: '123e4567-e89b-12d3-a456-426614174002',
      party_size: 2,
      status: 'pending' as const,
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-01-01T12:00:00Z'
    };

    it('should accept valid join request with all fields', () => {
      const validRequest = {
        ...baseRequest,
        note: 'Test note',
        hold_expires_at: '2024-01-01T12:30:00Z'
      };

      const result = JoinRequest.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should accept request with minimal required fields', () => {
      const minimalRequest = {
        ...baseRequest,
        note: null,
        hold_expires_at: null
      };

      const result = JoinRequest.safeParse(minimalRequest);
      expect(result.success).toBe(true);
    });

    it('should validate UUID formats', () => {
      const invalidUuids = ['invalid-id', '123', '', 'not-a-uuid'];
      
      invalidUuids.forEach(invalidId => {
        const result = JoinRequest.safeParse({
          ...baseRequest,
          id: invalidId
        });
        expect(result.success).toBe(false);
      });
    });

    it('should validate datetime formats', () => {
      const invalidDates = ['2024-01-01', 'not-a-date', '2024-13-01T12:00:00Z'];
      
      invalidDates.forEach(invalidDate => {
        const result = JoinRequest.safeParse({
          ...baseRequest,
          created_at: invalidDate
        });
        expect(result.success).toBe(false);
      });
    });

    it('should accept null for optional datetime fields', () => {
      const result = JoinRequest.safeParse({
        ...baseRequest,
        hold_expires_at: null
      });
      expect(result.success).toBe(true);
    });
  });

  describe('PaginatedJoinRequests', () => {
    it('should accept valid paginated response', () => {
      const validResponse = {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            event_id: '123e4567-e89b-12d3-a456-426614174001',
            user_id: '123e4567-e89b-12d3-a456-426614174002',
            party_size: 2,
            status: 'pending' as const,
            created_at: '2024-01-01T12:00:00Z',
            updated_at: '2024-01-01T12:00:00Z'
          }
        ],
        nextOffset: 20,
        totalCount: 45
      };

      const result = PaginatedJoinRequests.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should accept null nextOffset when no more pages', () => {
      const validResponse = {
        data: [],
        nextOffset: null,
        totalCount: 0
      };

      const result = PaginatedJoinRequests.safeParse(validResponse);
      expect(result.success).toBe(true);
    });

    it('should reject negative counts', () => {
      const invalidResponse = {
        data: [],
        nextOffset: null,
        totalCount: -1
      };

      const result = PaginatedJoinRequests.safeParse(invalidResponse);
      expect(result.success).toBe(false);
    });
  });

  describe('Availability', () => {
    it('should accept valid availability data', () => {
      const validAvailability = {
        total: 20,
        confirmed: 5,
        held: 3,
        available: 12
      };

      const result = Availability.safeParse(validAvailability);
      expect(result.success).toBe(true);
    });

    it('should accept zero values', () => {
      const zeroAvailability = {
        total: 0,
        confirmed: 0,
        held: 0,
        available: 0
      };

      const result = Availability.safeParse(zeroAvailability);
      expect(result.success).toBe(true);
    });

    it('should reject negative values', () => {
      const negativeFields = ['total', 'confirmed', 'held', 'available'];
      
      negativeFields.forEach(field => {
        const invalidAvailability = {
          total: 10,
          confirmed: 5,
          held: 2,
          available: 3,
          [field]: -1
        };

        const result = Availability.safeParse(invalidAvailability);
        expect(result.success).toBe(false);
      });
    });

    it('should reject non-integer values', () => {
      const invalidAvailability = {
        total: 20.5,
        confirmed: 5,
        held: 3,
        available: 12
      };

      const result = Availability.safeParse(invalidAvailability);
      expect(result.success).toBe(false);
    });
  });

  describe('EventIdParam', () => {
    it('should accept valid UUID', () => {
      const validParam = {
        eventId: '123e4567-e89b-12d3-a456-426614174000'
      };

      const result = EventIdParam.safeParse(validParam);
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const invalidParams = [
        { eventId: 'not-a-uuid' },
        { eventId: '123' },
        { eventId: '' },
        { eventId: null },
        {}
      ];

      invalidParams.forEach(param => {
        const result = EventIdParam.safeParse(param);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('ListRequestsQuery', () => {
    it('should accept valid query parameters', () => {
      const validQuery = {
        limit: 10,
        offset: 20,
        status: 'pending' as const
      };

      const result = ListRequestsQuery.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const emptyQuery = {};

      const result = ListRequestsQuery.safeParse(emptyQuery);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(0);
        expect(result.data.status).toBeUndefined();
      }
    });

    it('should enforce limits on limit parameter', () => {
      // Test minimum limit
      const tooSmall = ListRequestsQuery.safeParse({ limit: 0 });
      expect(tooSmall.success).toBe(false);

      // Test maximum limit
      const tooBig = ListRequestsQuery.safeParse({ limit: 101 });
      expect(tooBig.success).toBe(false);

      // Test valid boundaries
      const minValid = ListRequestsQuery.safeParse({ limit: 1 });
      expect(minValid.success).toBe(true);

      const maxValid = ListRequestsQuery.safeParse({ limit: 100 });
      expect(maxValid.success).toBe(true);
    });

    it('should enforce minimum offset', () => {
      const negativeOffset = ListRequestsQuery.safeParse({ offset: -1 });
      expect(negativeOffset.success).toBe(false);

      const validOffset = ListRequestsQuery.safeParse({ offset: 0 });
      expect(validOffset.success).toBe(true);
    });

    it('should validate status values', () => {
      const validStatuses = ['pending', 'approved', 'declined', 'waitlisted', 'expired', 'cancelled'];
      
      validStatuses.forEach(status => {
        const result = ListRequestsQuery.safeParse({ status });
        expect(result.success).toBe(true);
      });

      const invalidStatus = ListRequestsQuery.safeParse({ status: 'invalid' });
      expect(invalidStatus.success).toBe(false);
    });
  });

  describe('JoinRequestConfig', () => {
    it('should accept valid configuration', () => {
      const validConfig = {
        JOIN_HOLD_TTL_MIN: 30
      };

      const result = JoinRequestConfig.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should use default value', () => {
      const result = JoinRequestConfig.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.JOIN_HOLD_TTL_MIN).toBe(30);
      }
    });

    it('should enforce TTL limits', () => {
      // Test minimum
      const tooSmall = JoinRequestConfig.safeParse({ JOIN_HOLD_TTL_MIN: 4 });
      expect(tooSmall.success).toBe(false);

      // Test maximum
      const tooBig = JoinRequestConfig.safeParse({ JOIN_HOLD_TTL_MIN: 121 });
      expect(tooBig.success).toBe(false);

      // Test boundaries
      const minValid = JoinRequestConfig.safeParse({ JOIN_HOLD_TTL_MIN: 5 });
      expect(minValid.success).toBe(true);

      const maxValid = JoinRequestConfig.safeParse({ JOIN_HOLD_TTL_MIN: 120 });
      expect(maxValid.success).toBe(true);
    });
  });

  describe('EventRequestParams', () => {
    it('should accept valid combined parameters', () => {
      const validParams = {
        eventId: '123e4567-e89b-12d3-a456-426614174000',
        requestId: '123e4567-e89b-12d3-a456-426614174001'
      };

      const result = EventRequestParams.safeParse(validParams);
      expect(result.success).toBe(true);
    });

    it('should require both parameters', () => {
      const missingEvent = { requestId: '123e4567-e89b-12d3-a456-426614174001' };
      const missingRequest = { eventId: '123e4567-e89b-12d3-a456-426614174000' };

      expect(EventRequestParams.safeParse(missingEvent).success).toBe(false);
      expect(EventRequestParams.safeParse(missingRequest).success).toBe(false);
    });
  });

  describe('Edge cases and data coercion', () => {
    it('should handle string numbers in party_size', () => {
      // Zod should coerce string to number for party_size
      const stringNumber = JoinRequestAdd.safeParse({ party_size: '2' });
      // This should fail since we expect actual numbers, not strings
      expect(stringNumber.success).toBe(false);
    });

    it('should handle whitespace in note field', () => {
      const whitespaceNote = JoinRequestAdd.safeParse({ 
        party_size: 1, 
        note: '   ' 
      });
      expect(whitespaceNote.success).toBe(true);
    });

    it('should handle empty string note', () => {
      const emptyNote = JoinRequestAdd.safeParse({ 
        party_size: 1, 
        note: '' 
      });
      expect(emptyNote.success).toBe(true);
    });
  });
});
