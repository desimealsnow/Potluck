import React, { useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  RefreshControl 
} from 'react-native';
import { useHostJoinRequests } from '@/hooks/useJoinRequests';
import { JoinRequestData, JoinRequestStatus, apiClient } from '@/services/apiClient';
import { styles } from '../styles/JoinRequestManagerStyle';

interface JoinRequestsManagerProps {
  eventId: string;
}

interface JoinRequestItemProps {
  request: JoinRequestData;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onWaitlist: (id: string) => void;
  onExtendHold: (id: string) => void;
  processing: string | null;
}

function JoinRequestItem({ 
  request, 
  onApprove, 
  onDecline, 
  onWaitlist, 
  onExtendHold,
  processing 
}: JoinRequestItemProps) {
  const isProcessing = processing === request.id;
  const isPending = request.status === 'pending';
  const isHoldExpired = request.hold_expires_at && new Date(request.hold_expires_at) <= new Date();

  const getStatusColor = (status: JoinRequestStatus) => {
    switch (status) {
      case 'pending': return isHoldExpired ? '#ff6b6b' : '#007AFF';
      case 'approved': return '#4CAF50';
      case 'declined': return '#f44336';
      case 'waitlisted': return '#FF9800';
      case 'expired': return '#999';
      case 'cancelled': return '#999';
      default: return '#666';
    }
  };

  const getStatusText = (status: JoinRequestStatus) => {
    if (status === 'pending' && isHoldExpired) {
      return 'EXPIRED';
    }
    return status.toUpperCase();
  };

  const formatHoldExpiry = (expiresAt?: string) => {
    if (!expiresAt) return null;
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMinutes = Math.floor((expiry.getTime() - now.getTime()) / 60000);
    
    if (diffMinutes <= 0) return 'Expired';
    if (diffMinutes < 60) return `${diffMinutes}m remaining`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ${diffMinutes % 60}m remaining`;
  };

  return (
    <View style={styles.requestItem}>
      <View style={styles.requestHeader}>
        <View>
          <Text style={styles.requestTitle}>
            Party of {request.party_size}
          </Text>
          {request.note && (
            <Text style={styles.requestNote} numberOfLines={2}>
              "{request.note}"
            </Text>
          )}
          <Text style={styles.requestDate}>
            Requested {new Date(request.created_at).toLocaleDateString()}
          </Text>
          {isPending && request.hold_expires_at && (
            <Text style={[
              styles.holdExpiry,
              { color: isHoldExpired ? '#f44336' : '#666' }
            ]}>
              {formatHoldExpiry(request.hold_expires_at)}
            </Text>
          )}
        </View>
        
        <View style={[
          styles.statusBadge, 
          { backgroundColor: getStatusColor(request.status) }
        ]}>
          <Text style={styles.statusText}>
            {getStatusText(request.status)}
          </Text>
        </View>
      </View>

      {isPending && !isHoldExpired && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => onApprove(request.id)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.approveButtonText}>✓ Approve</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.waitlistButton]}
            onPress={() => onWaitlist(request.id)}
            disabled={isProcessing}
          >
            <Text style={styles.waitlistButtonText}>⏳ Waitlist</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={() => onDecline(request.id)}
            disabled={isProcessing}
          >
            <Text style={styles.declineButtonText}>✗ Decline</Text>
          </TouchableOpacity>
        </View>
      )}

      {isPending && !isHoldExpired && (
        <TouchableOpacity
          style={styles.extendButton}
          onPress={() => onExtendHold(request.id)}
          disabled={isProcessing}
        >
          <Text style={styles.extendButtonText}>⏰ Extend Hold (+30min)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function JoinRequestsManager({ eventId }: JoinRequestsManagerProps) {
  const [statusFilter, setStatusFilter] = useState<JoinRequestStatus | undefined>();
  
  const {
    requests,
    loading,
    error,
    totalCount,
    processing,
    approveRequest,
    declineRequest,
    waitlistRequest,
    extendHold,
    refresh,
  } = useHostJoinRequests(eventId);

  const statusFilters: Array<{ key: JoinRequestStatus | undefined; label: string }> = [
    { key: undefined, label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'waitlisted', label: 'Waitlisted' },
    { key: 'declined', label: 'Declined' },
  ];

  const handlePromote = async () => {
    try {
      const res = await apiClient.promoteWaitlist(eventId);
      Alert.alert('Promotion Complete', res?.moved ? `Moved ${res.moved} request(s).` : 'No eligible waitlisted requests.');
      refresh();
    } catch (e: any) {
      Alert.alert('Promotion Failed', e?.message ?? 'Unknown error');
    }
  };

  const moveWaitlistedToTop = async (requestId: string) => {
    try {
      await apiClient.reorderWaitlisted(eventId, requestId, 1);
      refresh();
    } catch (e: any) {
      Alert.alert('Reorder Failed', e?.message ?? 'Unknown error');
    }
  };

  const handleApprove = (requestId: string) => {
    Alert.alert(
      'Approve Request',
      'This will add the guest to your event and consume capacity. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveRequest(requestId) },
      ]
    );
  };

  const handleDecline = (requestId: string) => {
    Alert.alert(
      'Decline Request',
      'The guest will be notified that their request was declined.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Decline', style: 'destructive', onPress: () => declineRequest(requestId) },
      ]
    );
  };

  const handleWaitlist = (requestId: string) => {
    Alert.alert(
      'Add to Waitlist',
      'The guest will be notified and may be approved if capacity becomes available.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Waitlist', onPress: () => waitlistRequest(requestId) },
      ]
    );
  };

  const handleExtendHold = (requestId: string) => {
    Alert.alert(
      'Extend Hold',
      'This will give you more time to decide on this request.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Extend (+30min)', onPress: () => extendHold(requestId) },
      ]
    );
  };

  const renderRequestItem = ({ item }: { item: JoinRequestData }) => (
    <JoinRequestItem
      request={item}
      onApprove={handleApprove}
      onDecline={handleDecline}
      onWaitlist={handleWaitlist}
      onExtendHold={handleExtendHold}
      processing={processing}
      // Inline move-to-top control for waitlisted entries could be added here later
    />
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load join requests</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Join Requests ({totalCount})</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
          <TouchableOpacity style={[styles.filterButton, styles.activeFilterButton]} onPress={handlePromote}>
            <Text style={styles.activeFilterButtonText}>Promote Next</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.filterContainer}>
          {statusFilters.map(({ key, label }) => (
            <TouchableOpacity
              key={label}
              style={[
                styles.filterButton,
                statusFilter === key && styles.activeFilterButton
              ]}
              onPress={() => setStatusFilter(key)}
            >
              <Text style={[
                styles.filterButtonText,
                statusFilter === key && styles.activeFilterButtonText
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={requests}
        renderItem={renderRequestItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        contentContainerStyle={requests.length === 0 ? styles.emptyContainer : undefined}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {loading ? 'Loading requests...' : 'No join requests yet'}
            </Text>
            {!loading && (
              <Text style={styles.emptyStateSubtext}>
                When guests request to join your event, they'll appear here.
              </Text>
            )}
          </View>
        }
      />
    </View>
  );
}

