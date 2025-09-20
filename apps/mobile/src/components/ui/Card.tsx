import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { getTheme, ui } from '@/theme';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
  style?: any;
  titleStyle?: any;
}

export function Card({ children, title, right, style, titleStyle }: CardProps) {
  const t = getTheme();
  return (
    <View style={[ui.card.base(), style]}>
      {title && (
        <View style={styles.header}>
          <Text style={[ui.card.title(), titleStyle]}>{title}</Text>
          {right}
        </View>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
