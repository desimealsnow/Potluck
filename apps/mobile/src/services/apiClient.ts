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
  private staticToken?: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Allow app to set a token explicitly to avoid timing issues
  setAuthToken(token?: string) {
    this.staticToken = token;
  }

  private async getAuthHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    try {
      if (this.staticToken) {
        headers.Authorization = `Bearer ${this.staticToken}`;
        console.log('🔐 Auth Debug (getAuthHeaders): using static token');
        return headers;
      }
      // Add timeout to prevent hanging
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth session timeout')), 3000)
      );
      const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
      const token = session?.access_token;
      
      console.log('🔐 Auth Debug (getAuthHeaders):', {
        hasSession: !!session,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
      });
      
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      } else {
        console.warn('⚠️ No authentication token found');
      }
    } catch (error) {
      console.warn('⚠️ Failed to get auth session:', error);
      // Continue without auth token - some endpoints might work without it
    }
    
    return headers;
  }

  async request<T>(
    path: string, 
    init?: RequestInit
  ): Promise<T> {
    let headers = await this.getAuthHeaders();
    let authHeader = (headers as any).Authorization as string | undefined;

    // If Authorization header is missing, wait briefly for auth to be ready (protected routes)
    const isProtected = path.startsWith('/'); // treat all our API paths as protected by default
    if (!authHeader && isProtected) {
      console.log('⏳ Waiting for auth token before calling', path);
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise(r => setTimeout(r, 250));
        headers = await this.getAuthHeaders();
        authHeader = (headers as any).Authorization as string | undefined;
        if (authHeader) break;
      }
      if (!authHeader) {
        console.warn('⚠️ Proceeding without auth header for', path);
      }
    }
    
    const url = `${this.baseUrl}${path}`;
    const authHeaderPreview2 = (headers as any).Authorization;
    console.log('🌐 API Request:', {
      url,
      method: (init?.method || 'GET'),
      hasAuthHeader: !!authHeaderPreview2,
      authHeaderPreview: authHeaderPreview2 ? `${String(authHeaderPreview2).slice(0, 24)}...` : 'none'
    });

    const response = await fetch(url, {
      ...init,
      headers: {
        ...headers,
        ...((init?.headers as Record<string, string>) || {}),
      },
    });

    console.log('🌐 API Response:', { url, status: response.status });

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
   * List pending join requests across my hosted events (host dashboard)
   */
  async listPendingApprovals(): Promise<PaginatedJoinRequestsData> {
    return this.get<PaginatedJoinRequestsData>(`/events/requests`);
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

  // ===============================================
  // Items Library API Methods
  // ===============================================

  async getItemCatalog(params?: { q?: string; category?: string }): Promise<ItemCatalog[]> {
    const qs = new URLSearchParams();
    if (params?.q) qs.set('q', params.q);
    if (params?.category) qs.set('category', params.category);
    const query = qs.toString();
    return this.get<ItemCatalog[]>(`/items/catalog${query ? `?${query}` : ''}`);
  }

  async listMyItems(): Promise<UserItem[]> {
    return this.get<UserItem[]>(`/items/me`);
  }

  async createMyItem(body: UserItemCreate): Promise<{ id: string }> {
    return this.post<{ id: string }>(`/items/me`, body);
  }

  async updateMyItem(id: string, body: UserItemUpdate): Promise<UserItem> {
    return this.put<UserItem>(`/items/me/${id}`, body);
  }

  async deleteMyItem(id: string): Promise<void> {
    return this.delete<void>(`/items/me/${id}`);
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

// Items library types (aligned with API spec)
export interface ItemCatalog {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  default_per_guest_qty?: number;
  dietary_tags?: string[];
  description?: string;
}

export interface UserItemCreate {
  name: string;
  category?: string;
  unit?: string;
  default_per_guest_qty?: number;
  dietary_tags?: string[];
  notes?: string;
}

export interface UserItem extends UserItemCreate {
  id: string;
}

export type UserItemUpdate = UserItemCreate;
