import React from 'react';
import { View, Text } from 'react-native';
import { useEventAvailability } from '@/hooks/useJoinRequests';
import { styles } from '../styles/AvailabilityBadgeStyle';

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


