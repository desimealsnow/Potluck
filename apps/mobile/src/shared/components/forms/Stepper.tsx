import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/ui/Icon';
import { colors, borderRadius } from '@/theme';
import type { StepperStep } from '@common/types';

export interface StepperProps {
  step: StepperStep;
  style?: any;
}

const steps = [
  { key: 0, icon: "Utensils", label: "Details" },
  { key: 1, icon: "MapPin", label: "Location" },
  { key: 2, icon: "Egg", label: "Items" },
  { key: 3, icon: "Users", label: "Participants" },
] as const;

export function Stepper({ step, style }: StepperProps) {
  return (
    <View style={[styles.container, style]}>
      {steps.map((s, i) => {
        const active = step === s.key;
        return (
          <View key={s.key} style={styles.stepContainer}>
            <LinearGradient
              colors={active ? ["#7C3AED", "#9333EA"] : ["#E5E7EB", "#F3F4F6"]}
              style={[
                styles.iconContainer,
                active && styles.iconContainerActive,
              ]}
            >
              <Icon
                name={s.icon as any}
                size={20}
                color={active ? colors.text.inverse : "#6B7280"}
              />
            </LinearGradient>
            <Text style={[
              styles.label,
              active && styles.labelActive,
            ]}>
              {s.label}
            </Text>
            {i < steps.length - 1 && (
              <View style={[
                styles.bar,
                active && styles.barActive,
              ]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 980,
  },
  stepContainer: {
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    shadowColor: '#7C3AED',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  label: {
    marginTop: 4,
    fontWeight: '700',
    color: '#6B7280',
  },
  labelActive: {
    color: '#7C3AED',
    fontWeight: '800',
  },
  bar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
    marginTop: 8,
  },
  barActive: {
    backgroundColor: '#7C3AED',
  },
});
