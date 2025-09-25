import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';

export interface LabelProps {
  children: React.ReactNode;
  style?: any;
  required?: boolean;
}

export function Label({ children, style, required = false }: LabelProps) {
  return (
    <Text style={[styles.label, style]}>
      {children}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: typography.fontWeight.extrabold,
    color: colors.text.primary,
    marginBottom: 6,
    marginTop: 6,
  },
  required: {
    color: colors.state.error,
  },
});
