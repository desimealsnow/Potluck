import { createEventWithItems, getEventDetails, publishEvent, cancelEvent, completeEvent } from '../../../src/services/events.service';
import { EventFactory, EventCancelFactory } from '../../fixtures/factories';
import { TEST_USERS } from '../../setup';
import * as eventsService from '../../../src/services/events.service';

// Mock Supabase client
jest.mock('../../../src/config/supabaseClient', () => ({
  supabase: {
    rpc: jest.fn(),
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    })),
    auth: {
      getUser: jest.fn()
    }
  }
}));

// Mock createClient from Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      eq: jest.fn(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    })),
    auth: {
      getUser: jest.fn()
    }
  }))
}));

// Mock logger
jest.mock('../../../src/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock schemas
jest.mock('../../../src/validators', () => ({
  schemas: {
    EventCreate: {
      parse: jest.fn((input) => input) // Pass-through mock
    }
  }
}));

import { supabase } from '../../../src/config/supabaseClient';
import { createClient } from '@supabase/supabase-js';

describe('EventsService Unit Tests', () => {
  let mockSupabaseClient: any;
  let mockQuery: any;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup mock query chain
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn()
    };

    // Setup mock Supabase client
    mockSupabaseClient = {
      rpc: jest.fn(),
      from: jest.fn(() => mockQuery),
      auth: {
        getUser: jest.fn()
      }
    };

    // Mock createClient to return our mock
    (createClient as jest.Mock).mockReturnValue(mockSupabaseClient);
    (supabase as any).rpc = jest.fn();
    (supabase as any).from = jest.fn(() => mockQuery);
  });

  describe('createEventWithItems', () => {
    it('should return success result when event creation succeeds', async () => {
      const eventInput = EventFactory.build();
      const userId = TEST_USERS.HOST.id;
      
      const mockEventResponse = {
        event: { id: '123', title: eventInput.title, status: 'draft' },
        items: [{ id: '456', name: 'Test Item' }]
      };

      // Mock successful RPC call
      (supabase as any).rpc.mockResolvedValue({
        data: mockEventResponse,
        error: null
      });

      const result = await createEventWithItems(eventInput, userId);

      expect(result.ok).toBe(true);
      expect(result.data).toEqual(mockEventResponse);
      
      // Verify RPC was called with correct parameters
      expect(supabase.rpc).toHaveBeenCalledWith('create_event_with_items', {
        _actor_id: userId,
        _payload: eventInput
      });
    });

    it('should return error result when database error occurs', async () => {
      const eventInput = EventFactory.build();
      const userId = TEST_USERS.HOST.id;

      // Mock database error
      const dbError = { message: 'Database connection failed', code: '42P01' };
      (supabase as any).rpc.mockResolvedValue({
        data: null,
        error: dbError
      });

      const result = await createEventWithItems(eventInput, userId);

      expect(result.ok).toBe(false);
      expect(result.error).toBe(dbError.message);
    });

    it('should validate input using schema', async () => {
      const eventInput = EventFactory.build();
      const userId = TEST_USERS.HOST.id;

      // Mock schema validation
      const { schemas } = require('../../../src/validators');
      schemas.EventCreate.parse.mockReturnValue(eventInput);

      // Mock successful response
      (supabase as any).rpc.mockResolvedValue({
        data: { event: {}, items: [] },
        error: null
      });

      await createEventWithItems(eventInput, userId);

      expect(schemas.EventCreate.parse).toHaveBeenCalledWith(eventInput);
    });
  });

  describe('getEventDetails', () => {
    const eventId = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should return event details with service role when no JWT provided', async () => {
      const mockEventData = {
        id: eventId,
        title: 'Test Event',
        created_by: TEST_USERS.HOST.id,
        location: { name: 'Test Location' },
        items: [{ id: '1', name: 'Test Item' }],
        participants: [{ id: '1', user_id: TEST_USERS.HOST.id }]
      };

      mockQuery.maybeSingle.mockResolvedValue({
        data: mockEventData,
        error: null
      });

      const result = await getEventDetails(eventId);

      expect(result.ok).toBe(true);
      expect(result.data.event.id).toBe(eventId);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.participants).toHaveLength(1);

      // Verify service role client was created
      expect(createClient).toHaveBeenCalledWith(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        undefined
      );
    });

    it('should return event details with user JWT when provided', async () => {
      const jwt = 'test.jwt.token';
      const mockEventData = {
        id: eventId,
        title: 'Test Event',
        created_by: TEST_USERS.HOST.id,
        location: { name: 'Test Location' },
        items: [],
        participants: []
      };

      mockQuery.maybeSingle.mockResolvedValue({
        data: mockEventData,
        error: null
      });

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: { id: TEST_USERS.HOST.id } },
        error: null
      });

      const result = await getEventDetails(eventId, jwt);

      expect(result.ok).toBe(true);
      
      // Verify user-scoped client was created
      expect(createClient).toHaveBeenCalledWith(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${jwt}` } } }
      );
    });

    it('should return 404 when event not found', async () => {
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await getEventDetails(eventId);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('404');
      expect(result.error).toBe('Event not found');
    });

    it('should return 500 on database error', async () => {
      const dbError = { message: 'Connection timeout', code: 'PGRST301' };
      
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: dbError
      });

      const result = await getEventDetails(eventId);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('500');
      expect(result.error).toBe(dbError.message);
    });

    it('should handle RLS policy violations gracefully', async () => {
      const rlsError = { message: 'new row violates row-level security', code: '42501' };
      
      mockQuery.maybeSingle.mockResolvedValue({
        data: null,
        error: rlsError
      });

      const result = await getEventDetails(eventId);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('500');
    });
  });

  describe('publishEvent', () => {
    const eventId = '123e4567-e89b-12d3-a456-426614174000';
    const actorId = TEST_USERS.HOST.id;

    it('should publish draft event successfully', async () => {
      const mockEvent = {
        id: eventId,
        status: 'draft',
        created_by: actorId,
        title: 'Test Event'
      };

      // Mock event fetch
      mockQuery.single.mockResolvedValueOnce({
        data: mockEvent,
        error: null
      });

      // Mock successful update
      mockQuery.single.mockResolvedValueOnce({
        data: { ...mockEvent, status: 'published' },
        error: null
      });

      // Mock getEventDetails call (publishEvent calls it at the end)
      jest.spyOn(eventsService, 'getEventDetails').mockResolvedValue({
        ok: true,
        data: {
          event: { ...mockEvent, status: 'published' },
          items: [],
          participants: []
        }
      });

      const result = await publishEvent(eventId, actorId);

      expect(result.ok).toBe(true);
      expect(result.data.event.status).toBe('published');

      // Verify status was updated
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'published',
        published_at: expect.any(String)
      });
    });

    it('should reject publication by non-host', async () => {
      const mockEvent = {
        id: eventId,
        status: 'draft',
        created_by: TEST_USERS.PARTICIPANT.id, // Different from actorId
        title: 'Test Event'
      };

      mockQuery.single.mockResolvedValue({
        data: mockEvent,
        error: null
      });

      const result = await publishEvent(eventId, actorId);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('403');
      expect(result.error).toContain('only host can publish');
    });

    it('should reject publication of non-draft events', async () => {
      const mockEvent = {
        id: eventId,
        status: 'published', // Already published
        created_by: actorId,
        title: 'Test Event'
      };

      mockQuery.single.mockResolvedValue({
        data: mockEvent,
        error: null
      });

      const result = await publishEvent(eventId, actorId);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('409');
      expect(result.error).toContain('Only draft events can be published');
    });

    it('should return 404 for non-existent event', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: { message: 'No rows found' }
      });

      const result = await publishEvent(eventId, actorId);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('404');
      expect(result.error).toBe('Event not found');
    });
  });

  describe('cancelEvent', () => {
    const eventId = '123e4567-e89b-12d3-a456-426614174000';
    const actorId = TEST_USERS.HOST.id;

    it('should cancel published event with valid reason', async () => {
      const mockEvent = {
        id: eventId,
        status: 'published',
        created_by: actorId,
        title: 'Test Event'
      };

      const cancelPayload = EventCancelFactory.build({
        reason: 'Venue unavailable due to emergency'
      });

      // Mock event fetch
      mockQuery.single.mockResolvedValueOnce({
        data: mockEvent,
        error: null
      });

      // Mock successful update
      mockQuery.single.mockResolvedValueOnce({
        data: { ...mockEvent, status: 'cancelled' },
        error: null
      });

      // Mock getEventDetails response
      jest.spyOn(eventsService, 'getEventDetails').mockResolvedValue({
        ok: true,
        data: {
          event: { ...mockEvent, status: 'cancelled' },
          items: [],
          participants: []
        }
      });

      const result = await cancelEvent(eventId, actorId, cancelPayload);

      expect(result.ok).toBe(true);
      expect(result.data.event.status).toBe('cancelled');

      // Verify cancellation details were saved
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'cancelled',
        cancelled_at: expect.any(String),
        cancel_reason: cancelPayload.reason
      });
    });

    it('should reject cancellation without reason', async () => {
      const mockEvent = {
        id: eventId,
        status: 'published',
        created_by: actorId
      };

      mockQuery.single.mockResolvedValue({
        data: mockEvent,
        error: null
      });

      const result = await cancelEvent(eventId, actorId, {
        reason: '', // Empty reason
        notifyGuests: true
      });

      expect(result.ok).toBe(false);
      expect(result.code).toBe('400');
      expect(result.error).toContain('Cancel reason is required');
    });

    it('should only allow cancelling published events', async () => {
      const mockEvent = {
        id: eventId,
        status: 'draft', // Not published
        created_by: actorId
      };

      mockQuery.single.mockResolvedValue({
        data: mockEvent,
        error: null
      });

      const cancelPayload = EventCancelFactory.build();

      const result = await cancelEvent(eventId, actorId, cancelPayload);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('409');
      expect(result.error).toContain('Only published events can be cancelled');
    });

    it('should reject cancellation by non-host', async () => {
      const mockEvent = {
        id: eventId,
        status: 'published',
        created_by: TEST_USERS.PARTICIPANT.id // Different from actorId
      };

      mockQuery.single.mockResolvedValue({
        data: mockEvent,
        error: null
      });

      const cancelPayload = EventCancelFactory.build();

      const result = await cancelEvent(eventId, actorId, cancelPayload);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('403');
      expect(result.error).toContain('only host can cancel');
    });
  });

  describe('completeEvent', () => {
    const eventId = '123e4567-e89b-12d3-a456-426614174000';
    const actorId = TEST_USERS.HOST.id;

    it('should complete published event successfully', async () => {
      const mockEvent = {
        id: eventId,
        status: 'published',
        created_by: actorId,
        title: 'Test Event'
      };

      // Mock event fetch
      mockQuery.single.mockResolvedValueOnce({
        data: mockEvent,
        error: null
      });

      // Mock successful update
      mockQuery.single.mockResolvedValueOnce({
        data: { ...mockEvent, status: 'completed' },
        error: null
      });

      // Mock getEventDetails response
      jest.spyOn(eventsService, 'getEventDetails').mockResolvedValue({
        ok: true,
        data: {
          event: { ...mockEvent, status: 'completed' },
          items: [],
          participants: []
        }
      });

      const result = await completeEvent(eventId, actorId);

      expect(result.ok).toBe(true);
      expect(result.data.event.status).toBe('completed');

      // Verify completion timestamp was added
      expect(mockQuery.update).toHaveBeenCalledWith({
        status: 'completed',
        completed_at: expect.any(String)
      });
    });

    it('should only allow completing published events', async () => {
      const mockEvent = {
        id: eventId,
        status: 'draft',
        created_by: actorId
      };

      mockQuery.single.mockResolvedValue({
        data: mockEvent,
        error: null
      });

      const result = await completeEvent(eventId, actorId);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('409');
      expect(result.error).toContain('Only published events can be completed');
    });

    it('should reject completion by non-host', async () => {
      const mockEvent = {
        id: eventId,
        status: 'published',
        created_by: TEST_USERS.PARTICIPANT.id
      };

      mockQuery.single.mockResolvedValue({
        data: mockEvent,
        error: null
      });

      const result = await completeEvent(eventId, actorId);

      expect(result.ok).toBe(false);
      expect(result.code).toBe('403');
      expect(result.error).toContain('only host can complete');
    });
  });
});