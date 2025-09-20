import React from 'react';
import { View, Text } from 'react-native';
import { getTheme } from '@/theme';

export function Stepper({ value, step, onChange }: { value?: number; step?: number; onChange?: (v: number) => void }) {
  const t = getTheme();
  const v = typeof value === 'number' ? value : (typeof step === 'number' ? step : 0);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 }}>
      {[0,1,2,3].map((i) => (
        <View key={i} style={{ height: 6, flex: 1, marginHorizontal: 4, borderRadius: 3, backgroundColor: i <= v ? t.colors.brand : t.colors.line }} />
      ))}
    </View>
  );
}
