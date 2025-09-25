import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Icon } from '@/ui/Icon';
import { colors, borderRadius } from '@/theme';

export function EmptyState({ icon = 'Calendar', title, subtitle, cta }: { icon?: import('./Icon').IconName; title: string; subtitle?: string; cta?: React.ReactNode }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={32} color={colors.text.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {cta}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16 },
  iconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text.primary, fontWeight: '800', fontSize: 18, marginTop: 12 },
  subtitle: { color: colors.text.secondary, fontWeight: '600', fontSize: 14, marginTop: 6, textAlign: 'center' },
});


