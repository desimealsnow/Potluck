import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius } from '@/theme';
import { Icon, IconName } from './Icon';

export type BannerTone = 'info' | 'success' | 'warning' | 'error';

const toneStyles: Record<BannerTone, { bg: string; fg: string; icon: IconName }> = {
  info: { bg: 'rgba(56,189,248,0.15)', fg: colors.text.primary, icon: 'Info' },
  success: { bg: 'rgba(34,197,94,0.18)', fg: colors.text.primary, icon: 'CircleCheck' },
  warning: { bg: 'rgba(245,158,11,0.18)', fg: colors.text.primary, icon: 'TriangleAlert' },
  error: { bg: 'rgba(239,68,68,0.18)', fg: colors.text.primary, icon: 'OctagonAlert' },
};

export function Banner({ tone = 'info', title, message, style }: { tone?: BannerTone; title?: string; message?: string; style?: any }) {
  const t = toneStyles[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: t.bg }, style]} accessibilityRole="alert">
      <Icon name={t.icon} color={t.fg} size={18} />
      <View style={{ marginLeft: 10, flex: 1 }}>
        {title ? <Text style={[styles.title, { color: t.fg }]}>{title}</Text> : null}
        {message ? <Text style={[styles.msg, { color: t.fg }]}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: borderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontWeight: '800', fontSize: 14 },
  msg: { fontWeight: '600', fontSize: 12, marginTop: 2 },
});


