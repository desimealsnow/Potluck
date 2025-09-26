import { borderRadius } from '@/theme';
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
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
