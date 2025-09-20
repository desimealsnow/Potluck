import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTheme } from '@/theme';

export interface ChipProps {
  children: React.ReactNode;
  tone?: 'sky' | 'emerald' | 'violet';
}

export function Chip({ children, tone = 'sky' }: ChipProps) {
  const t = getTheme();
  const toneBg = tone === 'emerald' ? 'rgba(34,197,94,0.15)' : tone === 'violet' ? 'rgba(124,58,237,0.15)' : 'rgba(56,189,248,0.15)';
  const toneFg = tone === 'emerald' ? '#166534' : tone === 'violet' ? '#5b21b6' : '#0c4a6e';
  return (
    <View style={[styles.chip, { backgroundColor: toneBg, borderColor: t.colors.line }]}>
      <Text style={[styles.text, { color: toneFg }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
