import React from 'react';
import { getTheme } from '@/theme';
import { LucideIcon, Home, Bell, User, Users, Calendar, Settings, Plus, Check, X } from 'lucide-react-native';

type IconName = 'home' | 'bell' | 'user' | 'users' | 'calendar' | 'settings' | 'plus' | 'check' | 'x';

const ICONS: Record<IconName, LucideIcon> = {
  home: Home,
  bell: Bell,
  user: User,
  users: Users,
  calendar: Calendar,
  settings: Settings,
  plus: Plus,
  check: Check,
  x: X,
};

export function Icon({ name, size = 20, color }: { name: IconName; size?: number; color?: string }) {
  const t = getTheme();
  const Cmp = ICONS[name];
  return <Cmp size={size} color={color || t.colors.text} />;
}

