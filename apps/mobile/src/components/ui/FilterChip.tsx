import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Icon } from './Icon';
import type { IconName } from './Icon';

export interface FilterChipProps {
  children: React.ReactNode;
  icon?: IconName;
  selected?: boolean;
  onPress?: () => void;
  style?: any;
  testID?: string;
}

export function FilterChip({
  children,
  icon,
  selected = false,
  onPress,
  style,
  testID,
}: FilterChipProps) {
  const chipStyle = [
    styles.chip,
    selected ? styles.chipSelected : styles.chipUnselected,
    style,
  ];
  
  const textStyle = [
    styles.text,
    selected ? styles.textSelected : styles.textUnselected,
  ];

  const iconColor = selected ? '#FFFFFF' : '#7B2FF7';

  const content = (
    <>
      {icon && (
        <Icon 
          name={icon}
          size={12}
          color={iconColor}
          style={styles.icon}
        />
      )}
      <Text style={textStyle}>{children}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={chipStyle} testID={testID}>
        {content}
      </Pressable>
    );
  }

  return (
    <View style={chipStyle} testID={testID}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    marginRight: 4,
    marginBottom: 0,
    minHeight: 28,
  },
  chipSelected: {
    backgroundColor: '#7B2FF7',
    shadowColor: '#7B2FF7',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  chipUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(123, 47, 247, 0.3)',
  },
  icon: {
    marginRight: 3,
  },
  text: {
    fontWeight: '600',
    fontSize: 12,
  },
  textSelected: {
    color: '#FFFFFF',
  },
  textUnselected: {
    color: '#7B2FF7',
  },
});
