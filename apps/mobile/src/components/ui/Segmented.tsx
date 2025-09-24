import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography } from '@/theme';

export interface SegmentedOption {
  key: string;
  label: string;
}

export interface SegmentedProps {
  options: SegmentedOption[];
  value: string;
  onChange: (key: string) => void;
  style?: any;
  testID?: string;
}

export function Segmented({ options, value, onChange, style, testID }: SegmentedProps) {
  return (
    <View style={[styles.container, style]} testID={testID}>
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[
              styles.option,
              selected && styles.optionSelected,
            ]}
            testID={`${testID}-option-${option.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[
              styles.text,
              selected && styles.textSelected,
            ]} testID={`${testID}-text-${option.key}`}>
              {option.label}
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
    backgroundColor: '#F1ECF8',
    borderRadius: 14,
    padding: 4,
  },
  option: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  text: {
    color: '#5B5B66',
    fontWeight: typography.fontWeight.bold,
    fontSize: typography.fontSize.sm,
  },
  textSelected: {
    color: '#1F1F23',
    fontWeight: typography.fontWeight.extrabold,
  },
});
