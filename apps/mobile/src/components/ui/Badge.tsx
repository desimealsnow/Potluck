import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTheme } from '@/theme';
import type { BadgeTone } from '@common/types';

export interface BadgeProps {
  text: string;
  tone?: BadgeTone;
  style?: any;
  textStyle?: any;
}

export function Badge({ text, tone = 'peach', style, textStyle }: BadgeProps) {
  const t = getTheme();
  const toneMap: Record<string, { bg: string; fg: string }> = {
    peach: { bg: 'rgba(255, 214, 194, 0.7)', fg: '#7A3E00' },
    indigo: { bg: 'rgba(208, 199, 255, 0.8)', fg: '#3A2A8C' },
  };
  const toneConfig = toneMap[tone] || { bg: t.colors.line, fg: t.colors.text };
  
  return (
    <View style={[
      styles.badge,
      { backgroundColor: toneConfig.bg },
      style,
    ]}>
      <Text style={[
        styles.text,
        { color: toneConfig.fg },
        textStyle,
      ]}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  text: {
    fontWeight: '800',
    fontSize: 12,
  },
});
