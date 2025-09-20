import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getTheme, ui } from '@/theme';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: any;
  textStyle?: any;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const t = getTheme();
  const buttonStyle = [
    ui.button.base(),
    size === 'sm' && { minHeight: 36, paddingHorizontal: 12, paddingVertical: 8 },
    size === 'lg' && { minHeight: 56, paddingHorizontal: 20, paddingVertical: 16 },
    variant === 'primary' && ui.button.solid(),
    variant === 'secondary' && ui.button.outline(),
    variant === 'ghost' && ui.button.ghost(),
    variant === 'danger' && ui.button.danger(),
    disabled && { opacity: 0.5 },
    style,
  ];

  const textStyleCombined = [
    ui.button.text(),
    size === 'sm' && { fontSize: 14 },
    size === 'md' && { fontSize: 16 },
    size === 'lg' && { fontSize: 18 },
    variant === 'secondary' && { color: t.colors.text },
    variant === 'ghost' && { color: t.colors.textMuted },
    disabled && { color: t.colors.textMuted },
    textStyle,
  ];

  const content = (
    <>
      {loading && <ActivityIndicator size="small" color={variant === 'secondary' ? t.colors.text : t.colors.white} />}
      {icon && !loading && icon}
      <Text style={textStyleCombined}>{title}</Text>
    </>
  );

  if (variant === 'primary' && !disabled) {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={buttonStyle} testID={testID}>
        <LinearGradient
          colors={[t.colors.brand, t.colors.brandAlt]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[ui.button.base(), size === 'sm' && { minHeight: 36, paddingHorizontal: 12, paddingVertical: 8 }, size === 'lg' && { minHeight: 56, paddingHorizontal: 20, paddingVertical: 16 }]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} style={buttonStyle} testID={testID}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({});
