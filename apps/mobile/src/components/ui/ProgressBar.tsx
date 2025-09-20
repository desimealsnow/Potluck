import React from 'react';
import { View, StyleSheet } from 'react-native';
import { borderRadius, tokens } from '@/theme';

export function ProgressBar({ value = 0, color = tokens.brand.secondary, height = 8, style }: { value?: number; color?: string; height?: number; style?: any }) {
  const pct = Math.min(1, Math.max(0, value));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(pct * 100), min: 0, max: 100 }}
    >
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color, borderRadius: height / 2 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});


