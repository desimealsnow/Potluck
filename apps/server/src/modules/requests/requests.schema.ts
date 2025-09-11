import { z } from 'zod';

// ===============================================
// Join Request Schemas
// ===============================================

export const JoinRequestStatus = z.enum([
  'pending', 
  'approved', 
  'declined', 
  'waitlisted', 
  'expired', 
  'cancelled'
]);

export const JoinRequestAdd = z.object({
  party_size: z.number().int().min(1),
  note: z.string().max(500).optional(),
}).strict();

export const JoinRequest = z.object({
  id: z.string().uuid(),
  event_id: z.string().uuid(),
  user_id: z.string().uuid(),
  party_size: z.number().int().min(1),
  note: z.string().optional().nullable(),
  status: JoinRequestStatus,
  hold_expires_at: z.string().datetime({ offset: true }).optional().nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
}).strict();

export const PaginatedJoinRequests = z.object({
  data: z.array(JoinRequest),
  nextOffset: z.number().int().nullable(),
  totalCount: z.number().int(),
}).strict();

// ===============================================
// Availability Schemas
// ===============================================

export const Availability = z.object({
  total: z.number().int().min(0),
  confirmed: z.number().int().min(0), 
  held: z.number().int().min(0),
  available: z.number().int().min(0),
}).strict();

// ===============================================
// Request Parameter Schemas
// ===============================================

export const EventIdParam = z.object({
  eventId: z.string().uuid(),
}).strict();

export const RequestIdParam = z.object({
  requestId: z.string().uuid(),
}).strict();

export const EventRequestParams = EventIdParam.merge(RequestIdParam);

export const ListRequestsQuery = z.object({
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  status: JoinRequestStatus.optional(),
}).strict();

// ===============================================
// Environment Configuration
// ===============================================

export const JoinRequestConfig = z.object({
  JOIN_HOLD_TTL_MIN: z.number().int().min(5).max(120).default(30),
}).strict();

// Export types for use in other modules
export type JoinRequestStatusType = z.infer<typeof JoinRequestStatus>;
export type JoinRequestAddType = z.infer<typeof JoinRequestAdd>;
export type JoinRequestType = z.infer<typeof JoinRequest>;
export type PaginatedJoinRequestsType = z.infer<typeof PaginatedJoinRequests>;
export type AvailabilityType = z.infer<typeof Availability>;
export type EventIdParamType = z.infer<typeof EventIdParam>;
export type RequestIdParamType = z.infer<typeof RequestIdParam>;
export type EventRequestParamsType = z.infer<typeof EventRequestParams>;
export type ListRequestsQueryType = z.infer<typeof ListRequestsQuery>;
