import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { getTheme } from '@/theme';
import { Ionicons } from '@expo/vector-icons';

export function FoodOption({ label, icon, selected, onPress }: { label: string; icon?: string; selected?: boolean; onPress?: () => void }) {
  const t = getTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, height: 64, borderRadius: 16, borderWidth: 1, borderColor: selected ? 'transparent' : t.colors.line, backgroundColor: selected ? 'rgba(34,197,94,0.2)' : t.colors.card, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      <View style={{ alignItems: 'center' }}>
        {icon && <Ionicons name={icon as any} size={16} color={selected ? t.colors.success : t.colors.text} />}
        <Text style={{ marginTop: 6, fontWeight: '800', color: t.colors.text }}>{label}</Text>
      </View>
    </Pressable>
  );
}
