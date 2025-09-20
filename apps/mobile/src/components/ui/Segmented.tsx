import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { getTheme } from '@/theme';

export interface SegmentedProps {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  testID?: string;
}

export function Segmented({ options, value, onChange, testID }: SegmentedProps) {
  const t = getTheme();
  return (
    <View style={[styles.container, { borderColor: t.colors.line }]}
      accessibilityRole="tablist"
      testID={testID}
    >
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[
              styles.item,
              active
                ? { backgroundColor: t.colors.brand }
                : { backgroundColor: 'transparent' },
            ]}
          >
            <Text style={[styles.label, { color: active ? t.colors.white : t.colors.text }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 2,
  },
  item: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
