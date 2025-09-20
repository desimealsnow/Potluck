import React from 'react';
import { LucideProps, icons } from 'lucide-react-native';

export type IconName = keyof typeof icons;

export interface IconProps extends Omit<LucideProps, 'name'> {
  name: IconName;
}

export const Icon: React.FC<IconProps> = ({ name, color = 'currentColor', size = 20, strokeWidth = 2, ...rest }) => {
  const Cmp = icons[name] as React.ComponentType<LucideProps> | undefined;
  if (!Cmp) return null;
  return <Cmp color={color} size={size} strokeWidth={strokeWidth} {...rest} />;
};

