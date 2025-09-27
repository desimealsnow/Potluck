import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { colors, typography } from '@/theme';

export interface LabelProps {
  children: React.ReactNode;
  style?: any;
  required?: boolean;
  testID?: string;
}

export function Label({ children, style, required = false, testID }: LabelProps) {
  return (
    <Text style={[styles.label, style]} testID={testID}>
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
