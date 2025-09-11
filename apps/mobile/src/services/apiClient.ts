import { supabase } from '@/config/supabaseClient';
import type { ApiResponse, ApiError as ApiErrorType } from '@common/types';

const API_BASE_URL = "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    console.log('🔐 Auth Debug:', {
      hasSession: !!session,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
    });
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('⚠️ No authentication token found');
    }
    
    return headers;
  }

  async request<T>(
    path: string, 
    init?: RequestInit
  ): Promise<T> {
    const headers = await this.getAuthHeaders();
    
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...((init?.headers as Record<string, string>) || {}),
      },
    });

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      let errorCode: string | undefined;
      
      try {
        const errorData = await response.json() as ApiErrorType;
        errorMessage = errorData.message || errorMessage;
        errorCode = errorData.code;
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage;
      }
      
      throw new ApiError(errorMessage, response.status, errorCode);
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  async post<T>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(path: string, data?: any): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }

  // ===============================================
  // Join Requests API Methods
  // ===============================================

  /**
   * Get event availability (capacity info)
   */
  async getEventAvailability(eventId: string): Promise<AvailabilityData> {
    return this.get<AvailabilityData>(`/events/${eventId}/availability`);
  }

  /**
   * Create a join request for an event
   */
  async createJoinRequest(eventId: string, data: JoinRequestCreateData): Promise<JoinRequestData> {
    return this.post<JoinRequestData>(`/events/${eventId}/requests`, data);
  }

  /**
   * List join requests for an event (host-only)
   */
  async listJoinRequests(eventId: string, query?: {
    limit?: number;
    offset?: number;
    status?: JoinRequestStatus;
  }): Promise<PaginatedJoinRequestsData> {
    const params = new URLSearchParams();
    if (query?.limit) params.set('limit', query.limit.toString());
    if (query?.offset) params.set('offset', query.offset.toString());
    if (query?.status) params.set('status', query.status);
    
    const queryString = params.toString();
    const url = `/events/${eventId}/requests${queryString ? `?${queryString}` : ''}`;
    return this.get<PaginatedJoinRequestsData>(url);
  }

  /**
   * Approve a join request (host-only)
   */
  async approveJoinRequest(eventId: string, requestId: string): Promise<JoinRequestData> {
    return this.patch<JoinRequestData>(`/events/${eventId}/requests/${requestId}/approve`);
  }

  /**
   * Decline a join request (host-only)
   */
  async declineJoinRequest(eventId: string, requestId: string): Promise<JoinRequestData> {
    return this.patch<JoinRequestData>(`/events/${eventId}/requests/${requestId}/decline`);
  }

  /**
   * Waitlist a join request (host-only)
   */
  async waitlistJoinRequest(eventId: string, requestId: string): Promise<JoinRequestData> {
    return this.patch<JoinRequestData>(`/events/${eventId}/requests/${requestId}/waitlist`);
  }

  /**
   * Cancel own join request (guest)
   */
  async cancelJoinRequest(eventId: string, requestId: string): Promise<JoinRequestData> {
    return this.patch<JoinRequestData>(`/events/${eventId}/requests/${requestId}/cancel`);
  }

  /**
   * Extend hold for a join request (host-only)
   */
  async extendJoinRequestHold(eventId: string, requestId: string, extensionMinutes?: number): Promise<JoinRequestData> {
    return this.post<JoinRequestData>(`/events/${eventId}/requests/${requestId}/extend`, {
      extension_minutes: extensionMinutes || 30
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export convenience functions for backward compatibility
export const api = <T>(path: string, init?: RequestInit): Promise<T> => {
  return apiClient.request<T>(path, init);
};

// ===============================================
// Types for join requests
// ===============================================

export type JoinRequestStatus = 'pending' | 'approved' | 'declined' | 'waitlisted' | 'expired' | 'cancelled';

export interface AvailabilityData {
  total: number;
  confirmed: number;
  held: number;
  available: number;
}

export interface JoinRequestCreateData {
  party_size: number;
  note?: string;
}

export interface JoinRequestData {
  id: string;
  event_id: string;
  user_id: string;
  party_size: number;
  note?: string;
  status: JoinRequestStatus;
  hold_expires_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PaginatedJoinRequestsData {
  data: JoinRequestData[];
  nextOffset: number | null;
  totalCount: number;
}
