import React from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';

export interface InputProps extends React.ComponentProps<typeof TextInput> {
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  error?: boolean;
  multiline?: boolean;
}

export function Input({
  leftIcon,
  rightIcon,
  onRightIconPress,
  error = false,
  multiline = false,
  style,
  ...props
}: InputProps) {
  return (
    <View style={[
      styles.container,
      multiline && styles.containerMultiline,
      error && styles.containerError
    ]}>
      {leftIcon && (
        <View style={styles.leftIcon}>
          <Ionicons name={leftIcon} size={16} color={colors.neutral[400]} />
        </View>
      )}
      <TextInput
        placeholderTextColor={colors.neutral[400]}
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          style
        ]}
        multiline={multiline}
        {...props}
      />
      {rightIcon && (
        <View style={styles.rightIcon}>
          <Ionicons 
            name={rightIcon} 
            size={16} 
            color={colors.neutral[400]}
            onPress={onRightIconPress}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    backgroundColor: colors.background.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
    paddingLeft: 0,
    overflow: 'hidden',
  },
  containerMultiline: {
    height: 80,
    alignItems: 'flex-start',
    paddingTop: 8,
  },
  containerError: {
    borderColor: colors.error[500],
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
