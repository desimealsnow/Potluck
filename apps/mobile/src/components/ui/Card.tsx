import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors, borderRadius, shadows } from '@/theme';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
  style?: any;
  titleStyle?: any;
}

export function Card({ children, title, right, style, titleStyle }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, titleStyle]}>{title}</Text>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: 16,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: 14,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text.primary,
  },
});
