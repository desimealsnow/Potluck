import { useState, useEffect, useCallback } from 'react';
import { apiClient, AvailabilityData, JoinRequestData, JoinRequestCreateData, JoinRequestStatus, PaginatedJoinRequestsData } from '../services/apiClient';
import { Alert } from 'react-native';

// ===============================================
// Hook for event availability data
// ===============================================
export function useEventAvailability(eventId: string) {
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailability = useCallback(async () => {
    if (!eventId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getEventAvailability(eventId);
      setAvailability(data);
    } catch (err) {
      console.error('Failed to fetch availability:', err);
      setError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  return {
    availability,
    loading,
    error,
    refresh: fetchAvailability,
  };
}

// ===============================================
// Hook for creating join requests
// ===============================================
export function useCreateJoinRequest(eventId: string) {
  const [creating, setCreating] = useState(false);

  const createRequest = useCallback(async (data: JoinRequestCreateData): Promise<JoinRequestData | null> => {
    try {
      setCreating(true);
      const request = await apiClient.createJoinRequest(eventId, data);
      
      Alert.alert(
        "🎯 Request Submitted!",
        `Your request for ${data.party_size} ${data.party_size === 1 ? 'person' : 'people'} has been submitted. The host will review it shortly.`,
        [{ text: 'OK' }]
      );
      
      return request;
    } catch (err) {
      console.error('Failed to create join request:', err);
      
      let errorMessage = 'Failed to submit request. Please try again.';
      if (err instanceof Error) {
        if (err.message.includes('capacity')) {
          errorMessage = 'Sorry, there\'s not enough capacity for your party size.';
        } else if (err.message.includes('already requested')) {
          errorMessage = 'You already have a pending request for this event.';
        } else {
          errorMessage = err.message;
        }
      }
      
      Alert.alert('Request Failed', errorMessage, [{ text: 'OK' }]);
      return null;
    } finally {
      setCreating(false);
    }
  }, [eventId]);

  return {
    createRequest,
    creating,
  };
}

// ===============================================
// Hook for managing join requests (host view)
// ===============================================
export function useHostJoinRequests(eventId: string) {
  const [requests, setRequests] = useState<JoinRequestData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async (
    offset = 0, 
    statusFilter?: JoinRequestStatus, 
    append = false
  ) => {
    if (!eventId) return;

    try {
      if (!append) setLoading(true);
      setError(null);

      const data = await apiClient.listJoinRequests(eventId, {
        limit: 20,
        offset,
        status: statusFilter,
      });

      if (append) {
        setRequests(prev => [...prev, ...data.data]);
      } else {
        setRequests(data.data);
      }
      
      setTotalCount(data.totalCount);
      setHasMore(data.nextOffset !== null);
    } catch (err) {
      console.error('Failed to fetch join requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  const approveRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      setProcessing(requestId);
      await apiClient.approveJoinRequest(eventId, requestId);
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'approved' as JoinRequestStatus } : req
      ));
      
      Alert.alert('✅ Request Approved', 'The guest has been added to your event!');
      return true;
    } catch (err) {
      console.error('Failed to approve request:', err);
      
      let errorMessage = 'Failed to approve request.';
      if (err instanceof Error && err.message.includes('capacity')) {
        errorMessage = 'Not enough capacity remaining for this party size.';
      }
      
      Alert.alert('Approval Failed', errorMessage);
      return false;
    } finally {
      setProcessing(null);
    }
  }, [eventId]);

  const declineRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      setProcessing(requestId);
      await apiClient.declineJoinRequest(eventId, requestId);
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'declined' as JoinRequestStatus } : req
      ));
      
      Alert.alert('❌ Request Declined', 'The guest has been notified.');
      return true;
    } catch (err) {
      console.error('Failed to decline request:', err);
      Alert.alert('Error', 'Failed to decline request.');
      return false;
    } finally {
      setProcessing(null);
    }
  }, [eventId]);

  const waitlistRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      setProcessing(requestId);
      await apiClient.waitlistJoinRequest(eventId, requestId);
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, status: 'waitlisted' as JoinRequestStatus } : req
      ));
      
      Alert.alert('⏳ Request Waitlisted', 'The guest has been added to the waitlist.');
      return true;
    } catch (err) {
      console.error('Failed to waitlist request:', err);
      Alert.alert('Error', 'Failed to waitlist request.');
      return false;
    } finally {
      setProcessing(null);
    }
  }, [eventId]);

  const extendHold = useCallback(async (requestId: string, minutes = 30): Promise<boolean> => {
    try {
      setProcessing(requestId);
      await apiClient.extendJoinRequestHold(eventId, requestId, minutes);
      
      // Update local state with new expiry (approximate)
      const newExpiry = new Date();
      newExpiry.setMinutes(newExpiry.getMinutes() + minutes);
      
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, hold_expires_at: newExpiry.toISOString() } : req
      ));
      
      Alert.alert('⏰ Hold Extended', `Hold extended by ${minutes} minutes.`);
      return true;
    } catch (err) {
      console.error('Failed to extend hold:', err);
      Alert.alert('Error', 'Failed to extend hold.');
      return false;
    } finally {
      setProcessing(null);
    }
  }, [eventId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return {
    requests,
    loading,
    error,
    totalCount,
    hasMore,
    processing,
    fetchRequests,
    approveRequest,
    declineRequest,
    waitlistRequest,
    extendHold,
    refresh: () => fetchRequests(),
  };
}

// ===============================================
// Hook for guest join request management
// ===============================================
export function useGuestJoinRequest(eventId: string, userId?: string) {
  const [userRequest, setUserRequest] = useState<JoinRequestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const checkForExistingRequest = useCallback(async () => {
    if (!eventId || !userId) return;

    try {
      setLoading(true);
      // Note: This would require a new API endpoint to get user's request for an event
      // For now, we'll fetch all requests and filter (not ideal for production)
      // In production, add GET /events/:eventId/requests/mine endpoint
      
      // Temporary implementation - in production, create dedicated endpoint
      console.log('Checking for existing request...', { eventId, userId });
    } catch (err) {
      console.error('Failed to check existing request:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, userId]);

  const cancelRequest = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      setCancelling(true);
      await apiClient.cancelJoinRequest(eventId, requestId);
      
      setUserRequest(prev => prev ? { ...prev, status: 'cancelled' } : null);
      
      Alert.alert('✅ Request Cancelled', 'Your join request has been cancelled.');
      return true;
    } catch (err) {
      console.error('Failed to cancel request:', err);
      
      let errorMessage = 'Failed to cancel request.';
      if (err instanceof Error && err.message.includes('expired')) {
        errorMessage = 'Cannot cancel - your hold has already expired.';
      }
      
      Alert.alert('Cancellation Failed', errorMessage);
      return false;
    } finally {
      setCancelling(false);
    }
  }, [eventId]);

  useEffect(() => {
    checkForExistingRequest();
  }, [checkForExistingRequest]);

  return {
    userRequest,
    loading,
    cancelling,
    cancelRequest,
    refresh: checkForExistingRequest,
  };
}
