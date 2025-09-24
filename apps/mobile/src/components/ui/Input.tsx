import React from 'react';
import { View, TextInput, StyleSheet, Platform, Pressable } from 'react-native';
import { colors, borderRadius } from '@/theme';
import { Icon } from './Icon';

export interface InputProps extends React.ComponentProps<typeof TextInput> {
  leftIcon?: import('./Icon').IconName;
  rightIcon?: import('./Icon').IconName;
  onRightIconPress?: () => void;
  error?: boolean;
  multiline?: boolean;
  testID?: string;
  variant?: 'default' | 'surface';
  containerStyle?: any;
}

export function Input({
  leftIcon,
  rightIcon,
  onRightIconPress,
  error = false,
  multiline = false,
  style,
  testID,
  variant = 'default',
  containerStyle,
  ...props
}: InputProps) {
  return (
    <View style={[
      styles.container,
      multiline && styles.containerMultiline,
      variant === 'surface' && styles.containerSurface,
      error && styles.containerError,
      containerStyle,
    ]} testID={`${testID}-container`}>
      {leftIcon && (
        <View style={styles.leftIcon}>
          <Icon name={leftIcon} size={18} color={colors.text.muted} />
        </View>
      )}
      <TextInput
        accessible
        accessibilityLabel={props.placeholder || 'input'}
        placeholderTextColor={props.placeholderTextColor || colors.text.muted}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          variant === 'surface' && styles.inputSurface,
          style
        ]}
        multiline={multiline}
        testID={testID}
        {...props}
      />
      {rightIcon && (
        <Pressable style={styles.rightIcon} onPress={onRightIconPress} accessibilityRole="button">
          <Icon name={rightIcon} size={18} color={colors.text.muted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.neutral.bg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    paddingLeft: 0,
    overflow: 'hidden',
  },
  containerSurface: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  inputSurface: {
    color: '#111111',
  },
  containerMultiline: {
    height: 80,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  containerError: {
    borderColor: colors.state.error,
  },
  leftIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightIcon: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingHorizontal: 6,
    fontSize: 15,
    color: colors.text.primary,
  },
  inputMultiline: {
    textAlignVertical: 'top',
    paddingTop: 8,
  },
});
