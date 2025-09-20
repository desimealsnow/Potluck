import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Icon } from '@/components/ui/Icon';
import { colors, borderRadius } from '@/theme';

export interface FoodOptionProps {
  selected?: boolean;
  label: string;
  icon: import('@/components/ui/Icon').IconName;
  onPress: () => void;
  style?: any;
}

/**
 * Renders a selectable food option with an icon and label.
 */
export function FoodOption({
  selected = false,
  label,
  icon,
  onPress,
  style,
}: FoodOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.option,
        selected && styles.optionSelected,
        style,
      ]}
    >
      <Icon
        name={icon}
        size={18}
        color={selected ? colors.text.inverse : '#9c6'}
      />
      <Text style={[
        styles.label,
        selected && styles.labelSelected,
      ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  option: {
    flex: 1,
    height: 64,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.12)',
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: '#1BAC55',
    borderColor: 'transparent',
  },
  label: {
    marginTop: 6,
    fontWeight: '800',
    color: '#585858',
  },
  labelSelected: {
    color: colors.text.inverse,
    fontWeight: '800',
  },
});
