import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { colors, chipTones } from '@/theme';
import { Icon } from '@/ui/Icon';
import type { ChipTone } from '@common/types';
import { styles } from '../styles/ChipStyle';

export interface ChipProps {
  children: React.ReactNode;
  icon?: import('./Icon').IconName;
  tone?: ChipTone;
  selected?: boolean;
  onPress?: () => void;
  style1?: any;
  textStyle?: any;
  testID?: string;
}

export function Chip({
  children,
  icon,
  tone = 'sky',
  selected = false,
  onPress,
  style1: style,
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
        <Icon 
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


