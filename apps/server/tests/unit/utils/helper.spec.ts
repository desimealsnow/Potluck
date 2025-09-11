import { 
  camelToSnake, 
  httpStatus, 
  toDbColumns, 
  mapDbError, 
  handle, 
  guardToService,
  mustFindOne 
} from '../../../src/utils/helper';
import { Response } from 'express';

describe('Helper Utils Unit Tests', () => {
  
  describe('camelToSnake', () => {
    it('should convert camelCase to snake_case', () => {
      expect(camelToSnake('eventDate')).toBe('event_date');
      expect(camelToSnake('minGuests')).toBe('min_guests');
      expect(camelToSnake('isPublic')).toBe('is_public');
      expect(camelToSnake('createdBy')).toBe('created_by');
    });

    it('should handle single words', () => {
      expect(camelToSnake('event')).toBe('event');
      expect(camelToSnake('title')).toBe('title');
    });

    it('should handle acronyms', () => {
      expect(camelToSnake('eventID')).toBe('event_i_d');
      expect(camelToSnake('apiKey')).toBe('api_key');
    });

    it('should handle empty string', () => {
      expect(camelToSnake('')).toBe('');
    });
  });

  describe('httpStatus', () => {
    it('should map service error codes to HTTP status codes', () => {
      expect(httpStatus('400')).toBe(400);
      expect(httpStatus('401')).toBe(401);
      expect(httpStatus('403')).toBe(403);
      expect(httpStatus('404')).toBe(404);
      expect(httpStatus('409')).toBe(409);
      expect(httpStatus('500')).toBe(500);
    });

    it('should default to 500 for unknown codes', () => {
      expect(httpStatus('999')).toBe(500);
      expect(httpStatus('abc')).toBe(500);
      expect(httpStatus(undefined)).toBe(500);
    });
  });

  describe('toDbColumns', () => {
    it('should convert object keys from camelCase to snake_case', () => {
      const input = {
        eventDate: '2024-01-01',
        minGuests: 10,
        isPublic: true,
        createdBy: 'user123'
      };

      const result = toDbColumns(input);

      expect(result).toEqual({
        event_date: '2024-01-01',
        min_guests: 10,
        is_public: true,
        created_by: 'user123'
      });
    });

    it('should skip undefined values', () => {
      const input = {
        title: 'Test Event',
        description: undefined,
        minGuests: 5
      };

      const result = toDbColumns(input);

      expect(result).toEqual({
        title: 'Test Event',
        min_guests: 5
      });
      expect(result).not.toHaveProperty('description');
    });

    it('should respect allowed keys filter', () => {
      const input = {
        title: 'Test Event',
        description: 'Test description',
        createdAt: '2024-01-01',
        userId: 'user123'
      };

      const allowed = ['title', 'description'] as const;
      const result = toDbColumns(input, allowed);

      expect(result).toEqual({
        title: 'Test Event',
        description: 'Test description'
      });
      expect(result).not.toHaveProperty('created_at');
      expect(result).not.toHaveProperty('user_id');
    });

    it('should handle empty object', () => {
      expect(toDbColumns({})).toEqual({});
    });

    it('should preserve null values', () => {
      const input = {
        title: 'Test',
        description: null,
        count: 0
      };

      const result = toDbColumns(input);

      expect(result).toEqual({
        title: 'Test',
        description: null,
        count: 0
      });
    });
  });

  describe('mapDbError', () => {
    it('should map PostgreSQL unique constraint violation', () => {
      const pgError = {
        message: 'duplicate key value violates unique constraint',
        code: '23505',
        details: 'Key (email)=(test@example.com) already exists.',
        hint: undefined,
        name: 'PostgrestError'
      } as any;

      const result = mapDbError(pgError);

      expect(result).toEqual({
        ok: false,
        error: pgError.message,
        code: '409'
      });
    });

    it('should map PostgreSQL foreign key violation', () => {
      const pgError = {
        message: 'insert or update on table violates foreign key constraint',
        code: '23503',
        details: 'Key (user_id)=(123) is not present in table "users".',
        hint: undefined,
        name: 'PostgrestError'
      } as any;

      const result = mapDbError(pgError);

      expect(result).toEqual({
        ok: false,
        error: pgError.message,
        code: '409'
      });
    });

    it('should map PostgreSQL permission denied', () => {
      const pgError = {
        message: 'permission denied for table events',
        code: '42501',
        details: undefined,
        hint: undefined,
        name: 'PostgrestError'
      } as any;

      const result = mapDbError(pgError);

      expect(result).toEqual({
        ok: false,
        error: pgError.message,
        code: '403'
      });
    });

    it('should default to 500 for unknown PostgreSQL errors', () => {
      const pgError = {
        message: 'connection timeout',
        code: '08006',
        details: undefined,
        hint: undefined,
        name: 'PostgrestError'
      } as any;

      const result = mapDbError(pgError);

      expect(result).toEqual({
        ok: false,
        error: pgError.message,
        code: '500'
      });
    });

    it('should handle null error input', () => {
      const result = mapDbError(null);

      expect(result).toEqual({
        ok: false,
        error: 'Unknown DB error',
        code: '500'
      });
    });

    it('should handle error without message', () => {
      const pgError = {
        code: '23505'
      } as any;

      const result = mapDbError(pgError);

      expect(result).toEqual({
        ok: false,
        error: 'DB error',
        code: '409'
      });
    });
  });

  describe('handle', () => {
    let mockRes: Partial<Response>;
    let statusMock: jest.Mock;
    let jsonMock: jest.Mock;

    beforeEach(() => {
      statusMock = jest.fn().mockReturnThis();
      jsonMock = jest.fn();
      
      mockRes = {
        status: statusMock,
        json: jsonMock
      };
    });

    it('should handle success result with default 200 status', () => {
      const successResult = {
        ok: true as const,
        data: { id: '123', title: 'Test Event' }
      };

      handle(mockRes as Response, successResult);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(successResult.data);
    });

    it('should handle success result with custom status', () => {
      const successResult = {
        ok: true as const,
        data: { id: '123', title: 'Test Event' }
      };

      handle(mockRes as Response, successResult, 201);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(successResult.data);
    });

    it('should handle error result with proper status mapping', () => {
      const errorResult = {
        ok: false as const,
        error: 'Event not found',
        code: '404' as const
      };

      handle(mockRes as Response, errorResult);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Event not found',
        code: '404'
      });
    });

    it('should include details for server errors (5xx)', () => {
      const errorResult = {
        ok: false as const,
        error: 'Database connection failed',
        code: '500' as const,
        details: { 
          connection: 'timeout',
          retry_count: 3 
        }
      };

      handle(mockRes as Response, errorResult);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Database connection failed',
        code: '500',
        details: errorResult.details
      });
    });

    it('should not include details for client errors (4xx)', () => {
      const errorResult = {
        ok: false as const,
        error: 'Validation failed',
        code: '400' as const,
        details: { 
          field: 'email',
          issue: 'invalid format'
        }
      };

      handle(mockRes as Response, errorResult);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Validation failed',
        code: '400'
      });
    });

    it('should default to 500 status for missing error code', () => {
      const errorResult = {
        ok: false as const,
        error: 'Unknown error'
      } as any;

      handle(mockRes as Response, errorResult);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        ok: false,
        error: 'Unknown error',
        code: '500'
      });
    });
  });

  describe('guardToService', () => {
    it('should convert guard error to service error', () => {
      const guardError = {
        ok: false as const,
        error: 'Access denied',
        code: '403' as const
      };

      const result = guardToService(guardError);

      expect(result).toEqual({
        ok: false,
        error: 'Access denied',
        code: '403'
      });
    });

    it('should handle guard success (fallback case)', () => {
      const guardSuccess = {
        ok: true as const,
        data: { allowed: true }
      } as any;

      const result = guardToService(guardSuccess);

      expect(result).toEqual({
        ok: false,
        error: 'Unexpected guard success',
        code: '500'
      });
    });
  });

  describe('mustFindOne', () => {
    let mockQuery: any;

    beforeEach(() => {
      mockQuery = {
        maybeSingle: jest.fn()
      };
    });

    it('should return success result when record found', async () => {
      const mockRecord = { id: '123', title: 'Test Event' };
      
      mockQuery.maybeSingle.mockResolvedValue({
        data: mockRecord,
        error: null
      });

      const result = await mustFindOne(mockQuery);

      expect(result).toEqual({
        ok: true,
        data: mockRecord
      });
    });

    it('should return 404 when no record found', async () => {
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await mustFindOne(mockQuery);

      expect(result).toEqual({
        ok: false,
        error: 'Not found',
        code: '404'
      });
    });

    it('should return 500 on database error', async () => {
      const dbError = {
        message: 'Connection timeout',
        code: '08006'
      };

      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError
      });

      const result = await mustFindOne(mockQuery);

      expect(result).toEqual({
        ok: false,
        error: dbError.message,
        code: '500',
        details: dbError
      });
    });
  });
});
