import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/ui/Icon';
import { Button } from '@/ui/Button';
import { PaymentStatusBadge } from '@/payments/components/PaymentStatusBadge';
import type { BillingPlan } from '@/services/payment.service';
import { styles } from '../styles/PlanCardStyles';

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
          {isPopular && <Icon name="Star" size={12} color="#fff" style={styles.badgeIcon} />}
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
      <Icon
        name={included ? 'CircleCheck' : 'CircleMinus'}
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

