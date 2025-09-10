import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface PaymentStatusBadgeProps {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired';
  size?: 'sm' | 'md' | 'lg';
}

export function PaymentStatusBadge({ status, size = 'md' }: PaymentStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          text: 'Active',
          color: '#10B981',
          bgColor: '#D1FAE5',
          icon: 'checkmark-circle' as const,
        };
      case 'trialing':
        return {
          text: 'Trial',
          color: '#3B82F6',
          bgColor: '#DBEAFE',
          icon: 'time' as const,
        };
      case 'past_due':
        return {
          text: 'Past Due',
          color: '#F59E0B',
          bgColor: '#FEF3C7',
          icon: 'warning' as const,
        };
      case 'canceled':
        return {
          text: 'Canceled',
          color: '#EF4444',
          bgColor: '#FEE2E2',
          icon: 'close-circle' as const,
        };
      case 'incomplete':
        return {
          text: 'Incomplete',
          color: '#6B7280',
          bgColor: '#F3F4F6',
          icon: 'help-circle' as const,
        };
      case 'incomplete_expired':
        return {
          text: 'Expired',
          color: '#6B7280',
          bgColor: '#F3F4F6',
          icon: 'time-outline' as const,
        };
      default:
        return {
          text: status,
          color: '#6B7280',
          bgColor: '#F3F4F6',
          icon: 'help-circle' as const,
        };
    }
  };

  const config = getStatusConfig(status);
  const sizeConfig = {
    sm: { padding: 4, fontSize: 10, iconSize: 12 },
    md: { padding: 6, fontSize: 12, iconSize: 14 },
    lg: { padding: 8, fontSize: 14, iconSize: 16 },
  };

  const currentSize = sizeConfig[size];

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: config.bgColor,
        paddingHorizontal: currentSize.padding + 4,
        paddingVertical: currentSize.padding,
      }
    ]}>
      <Ionicons
        name={config.icon}
        size={currentSize.iconSize}
        color={config.color}
        style={styles.icon}
      />
      <Text style={[
        styles.text,
        {
          color: config.color,
          fontSize: currentSize.fontSize,
        }
      ]}>
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
  },
});
