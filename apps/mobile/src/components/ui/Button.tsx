import React from 'react';
import { Pressable, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, typography } from '@/theme';

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
  const buttonStyle = [
    styles.button,
    styles[`button_${size}`],
    styles[`button_${variant}`],
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`text_${size}`],
    styles[`text_${variant}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  const content = (
    <>
      {loading && <ActivityIndicator size="small" color={getTextColor(variant, disabled)} />}
      {icon && !loading && icon}
      <Text style={textStyleCombined}>{title}</Text>
    </>
  );

  if (variant === 'primary' && !disabled) {
    return (
      <Pressable onPress={onPress} disabled={disabled || loading} style={buttonStyle} testID={testID}>
        <LinearGradient
          colors={['#FF7A00', '#FF3D71']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, styles[`button_${size}`]]}
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

function getTextColor(variant: string, disabled: boolean): string {
  if (disabled) return colors.neutral[400];
  
  switch (variant) {
    case 'primary':
      return colors.text.inverse;
    case 'secondary':
      return colors.text.primary;
    case 'ghost':
      return colors.text.secondary;
    case 'danger':
      return colors.text.inverse;
    default:
      return colors.text.primary;
  }
}

const styles = StyleSheet.create({
  button: {
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  gradient: {
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  
  // Sizes
  button_sm: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  button_md: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  button_lg: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  
  // Variants
  button_primary: {
    backgroundColor: colors.primary[600],
  },
  button_secondary: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  button_ghost: {
    backgroundColor: 'transparent',
  },
  button_danger: {
    backgroundColor: colors.error[600],
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  
  // Text styles
  text: {
    fontWeight: typography.fontWeight.semibold,
  },
  text_sm: {
    fontSize: typography.fontSize.sm,
  },
  text_md: {
    fontSize: typography.fontSize.base,
  },
  text_lg: {
    fontSize: typography.fontSize.lg,
  },
  text_primary: {
    color: colors.text.inverse,
  },
  text_secondary: {
    color: colors.text.primary,
  },
  text_ghost: {
    color: colors.text.secondary,
  },
  text_danger: {
    color: colors.text.inverse,
  },
  textDisabled: {
    color: colors.neutral[400],
  },
});
