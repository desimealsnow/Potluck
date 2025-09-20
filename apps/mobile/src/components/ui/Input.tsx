import React from 'react';
import { TextInput, StyleSheet, View, Text } from 'react-native';
import { getTheme } from '@/theme';

export interface InputProps {
  label?: string;
  error?: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: any;
  multiline?: boolean;
  numberOfLines?: number;
  style?: any;
  leftIcon?: string; // reserved for future
  testID?: string;
}

export function Input({ label, error, value, onChangeText, placeholder, keyboardType, multiline, numberOfLines, style, leftIcon, testID }: InputProps) {
  const t = getTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && <Text style={{ color: t.colors.text, fontWeight: '700' }}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: t.colors.card,
            color: t.colors.text,
            borderColor: error ? t.colors.error : t.colors.line,
          },
          style,
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={t.colors.textMuted}
        multiline={multiline}
        numberOfLines={numberOfLines}
        testID={testID}
      />
      {error && <Text style={{ color: t.colors.error, fontSize: 12 }}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
});
