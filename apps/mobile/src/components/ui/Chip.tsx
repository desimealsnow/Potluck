import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, chipTones } from '@/theme';
import type { ChipTone } from '@common/types';

export interface ChipProps {
  children: React.ReactNode;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: ChipTone;
  selected?: boolean;
  onPress?: () => void;
  style?: any;
  textStyle?: any;
  testID?: string;
}

export function Chip({
  children,
  icon,
  tone = 'sky',
  selected = false,
  onPress,
  style,
  textStyle,
  testID,
}: ChipProps) {
  const toneConfig = chipTones[tone];
  const isPressable = !!onPress;
  
  const chipStyle = [
    styles.chip,
    {
      backgroundColor: selected ? toneConfig.background : 'rgba(255,255,255,0.15)',
      borderColor: selected ? 'transparent' : 'rgba(255,255,255,0.35)',
    },
    style,
  ];
  
  const textStyleCombined = [
    styles.text,
    {
      color: selected ? toneConfig.text : '#EAF2FF',
    },
    textStyle,
  ];

  const content = (
    <>
      {icon && (
        <Ionicons 
          name={icon} 
          size={14} 
          color={selected ? toneConfig.text : '#EAF2FF'} 
          style={styles.icon} 
        />
      )}
      <Text style={textStyleCombined}>{children}</Text>
    </>
  );

  if (isPressable) {
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    marginRight: 10,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontWeight: '700',
    fontSize: 14,
  },
});
