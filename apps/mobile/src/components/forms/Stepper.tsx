import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon } from '@/components/ui/Icon';
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
              colors={active ? ["#FF7A00", "#FF3D71"] : ["#FFE6D2", "#FFE6E9"]}
              style={[
                styles.iconContainer,
                active && styles.iconContainerActive,
              ]}
            >
              <Icon
                name={s.icon as any}
                size={20}
                color={active ? colors.text.inverse : "#FF7A00"}
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
    shadowColor: '#FF6A3D',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
  label: {
    marginTop: 4,
    fontWeight: '800',
    color: '#B26B4B',
  },
  labelActive: {
    color: '#D64545',
    fontWeight: '800',
  },
  bar: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F5D7C8',
    marginTop: 8,
  },
  barActive: {
    backgroundColor: '#FF9F68',
  },
});
