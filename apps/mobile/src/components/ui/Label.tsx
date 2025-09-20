import React from 'react';
import { Text } from 'react-native';
import { getTheme } from '@/theme';

export function Label({ children }: { children: React.ReactNode }) {
  const t = getTheme();
  return (
    <Text style={{ color: t.colors.text, fontWeight: '700', marginBottom: 6 }}>
      {children}
    </Text>
  );
}
