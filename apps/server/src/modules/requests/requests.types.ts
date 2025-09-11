// Re-export types from schema for consistency
export type {
  JoinRequestStatusType,
  JoinRequestAddType,
  JoinRequestType,
  PaginatedJoinRequestsType,
  AvailabilityType,
  EventIdParamType,
  RequestIdParamType,
  EventRequestParamsType,
  ListRequestsQueryType,
} from './requests.schema';

// Database row types (snake_case from Supabase)
export interface JoinRequestRow {
  id: string;
  event_id: string;
  user_id: string;
  party_size: number;
  note: string | null;
  status: string;
  hold_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRow {
  total: number;
  confirmed: number;
  held: number;
  available: number;
}

// Service layer error codes
export type RequestErrorCode = 
  | 'capacity_unavailable'
  | 'already_requested'
  | 'not_authorized'
  | 'hold_expired'
  | 'invalid_status_transition'
  | 'event_not_found'
  | 'request_not_found'
  | 'event_not_published'
  | 'already_participant';

// Request actions for different operations
export type RequestAction = 
  | 'create'
  | 'approve' 
  | 'decline'
  | 'waitlist'
  | 'cancel'
  | 'extend';
