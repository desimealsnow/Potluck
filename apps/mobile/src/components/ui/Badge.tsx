import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, badgeTones } from '@/theme';
import type { BadgeTone } from '@common/types';

export interface BadgeProps {
  text: string;
  tone?: BadgeTone;
  style?: any;
  textStyle?: any;
}

export function Badge({ text, tone = 'peach', style, textStyle }: BadgeProps) {
  const toneConfig = badgeTones[tone];
  
  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: toneConfig.background,
      },
      style,
    ]}>
      <Text style={[
        styles.text,
        {
          color: toneConfig.text,
        },
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
