import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useEventAvailability } from '@/hooks/useJoinRequests';

interface AvailabilityBadgeProps {
  eventId: string;
  compact?: boolean;
  showDetails?: boolean;
}

export default function AvailabilityBadge({ 
  eventId, 
  compact = false, 
  showDetails = false 
}: AvailabilityBadgeProps) {
  const { availability, loading } = useEventAvailability(eventId);

  if (loading || !availability) {
    return (
      <View style={[styles.badge, styles.loading]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const { total, confirmed, held, available } = availability;
  const utilization = total > 0 ? (confirmed + held) / total : 0;
  
  // Color based on availability
  let badgeStyle = styles.available;
  let statusText = 'Available';
  
  if (available === 0) {
    badgeStyle = styles.full;
    statusText = 'Full';
  } else if (utilization > 0.8) {
    badgeStyle = styles.almostFull;
    statusText = 'Almost Full';
  } else if (utilization > 0.5) {
    badgeStyle = styles.filling;
    statusText = 'Filling Up';
  }

  if (compact) {
    return (
      <View style={[styles.badge, styles.compact, badgeStyle]}>
        <Text style={styles.compactText}>
          {available > 0 ? `${available} spots` : 'Full'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.badge, badgeStyle]}>
      <Text style={styles.statusText}>{statusText}</Text>
      <Text style={styles.availabilityText}>
        {available} of {total} spots available
      </Text>
      
      {showDetails && (
        <View style={styles.details}>
          <Text style={styles.detailText}>• {confirmed} confirmed</Text>
          {held > 0 && <Text style={styles.detailText}>• {held} on hold</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 4,
  },
  compact: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginVertical: 2,
  },
  loading: {
    backgroundColor: '#f0f0f0',
  },
  available: {
    backgroundColor: '#e6f7e6',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  filling: {
    backgroundColor: '#fff3e0',
    borderColor: '#FF9800',
    borderWidth: 1,
  },
  almostFull: {
    backgroundColor: '#ffeaa7',
    borderColor: '#fdcb6e',
    borderWidth: 1,
  },
  full: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  availabilityText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  compactText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#333',
  },
  loadingText: {
    fontSize: 12,
    color: '#999',
  },
  details: {
    marginTop: 4,
  },
  detailText: {
    fontSize: 10,
    color: '#888',
    marginTop: 1,
  },
});
