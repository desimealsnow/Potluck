import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../ui/Button';
import { PaymentStatusBadge } from './PaymentStatusBadge';
import type { BillingPlan } from '../../services/payment.service';

export interface PlanCardProps {
  plan: BillingPlan;
  isCurrent?: boolean;
  isPopular?: boolean;
  onSelect: () => void;
  onCancel?: () => void;
  loading?: boolean;
  showFeatures?: boolean;
  features?: Array<{ label: string; included: boolean }>;
}

export function PlanCard({
  plan,
  isCurrent = false,
  isPopular = false,
  onSelect,
  onCancel,
  loading = false,
  showFeatures = true,
  features = [],
}: PlanCardProps) {
  const formatPrice = (amountCents: number, interval: string) => {
    const amount = amountCents / 100;
    const currency = plan.currency === 'usd' ? '$' : plan.currency === 'inr' ? '₹' : plan.currency.toUpperCase();
    return `${currency}${amount.toFixed(2)}/${interval === 'year' ? 'year' : 'month'}`;
  };

  const getPlanEmoji = (planName: string) => {
    const name = planName.toLowerCase();
    if (name.includes('free')) return '🆓';
    if (name.includes('pro')) return '⭐';
    if (name.includes('team')) return '👥';
    if (name.includes('premium')) return '💎';
    return '📦';
  };

  return (
    <View style={[
      styles.card,
      isCurrent && styles.currentCard,
      isPopular && styles.popularCard,
    ]}>
      {/* Badge */}
      {(isCurrent || isPopular) && (
        <View style={[
          styles.badge,
          isCurrent && styles.currentBadge,
          isPopular && styles.popularBadge,
        ]}>
          {isPopular && <Ionicons name="star" size={12} color="#fff" style={styles.badgeIcon} />}
          <Text style={styles.badgeText}>
            {isCurrent ? 'Current' : 'Popular'}
          </Text>
        </View>
      )}

      {/* Plan Header */}
      <View style={styles.header}>
        <View style={styles.planInfo}>
          <Text style={styles.planEmoji}>{getPlanEmoji(plan.name)}</Text>
          <View>
            <Text style={styles.planName}>{plan.name}</Text>
            <Text style={styles.planPrice}>{formatPrice(plan.amount_cents, plan.interval)}</Text>
          </View>
        </View>
        {isCurrent && (
          <PaymentStatusBadge status="active" size="sm" />
        )}
      </View>

      {/* Features */}
      {showFeatures && features.length > 0 && (
        <View style={styles.features}>
          {features.map((feature, index) => (
            <FeatureRow
              key={index}
              label={feature.label}
              included={feature.included}
            />
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {isCurrent ? (
          <View style={styles.currentActions}>
            <Button
              title="Manage Plan"
              onPress={onSelect}
              variant="secondary"
              size="md"
              style={styles.actionButton}
            />
            {onCancel && (
              <Button
                title="Cancel"
                onPress={onCancel}
                variant="ghost"
                size="md"
                style={[styles.actionButton, styles.cancelButton]}
              />
            )}
          </View>
        ) : (
          <Button
            title={plan.amount_cents === 0 ? 'Get Started' : 'Choose Plan'}
            onPress={onSelect}
            variant="primary"
            size="lg"
            loading={loading}
            style={styles.chooseButton}
          />
        )}
      </View>
    </View>
  );
}

function FeatureRow({ label, included }: { label: string; included: boolean }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons
        name={included ? 'checkmark-circle' : 'remove-circle'}
        size={16}
        color={included ? '#10B981' : '#D1D5DB'}
      />
      <Text style={[
        styles.featureText,
        !included && styles.featureTextDisabled
      ]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    backgroundColor: 'rgba(255,255,255,0.95)',
    padding: 24,
    marginBottom: 16,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
      },
      android: {
        elevation: 5,
      },
    }),
  },
  currentCard: {
    borderWidth: 2,
    borderColor: '#10B981',
  },
  popularCard: {
    borderWidth: 2,
    borderColor: '#F59E0B',
  },
  badge: {
    position: 'absolute',
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentBadge: {
    backgroundColor: '#10B981',
  },
  popularBadge: {
    backgroundColor: '#F59E0B',
  },
  badgeIcon: {
    marginRight: 4,
  },
  badgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  planInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  planEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  planName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },
  features: {
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#111',
    fontWeight: '500',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  featureTextDisabled: {
    color: '#9CA3AF',
  },
  actions: {
    marginTop: 8,
  },
  currentActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
  },
  cancelButton: {
    borderColor: '#EF4444',
  },
  chooseButton: {
    width: '100%',
  },
});
