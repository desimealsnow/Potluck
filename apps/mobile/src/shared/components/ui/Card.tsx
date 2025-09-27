import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Platform, Animated, Easing } from 'react-native';
import { colors, borderRadius, shadows } from '@/theme';
import { useTheme } from '@/theme/index';

export interface CardProps {
  children: React.ReactNode;
  title?: string;
  right?: React.ReactNode;
  style?: any;
  titleStyle?: any;
  testID?: string;
}

export function Card({ children, title, right, style, titleStyle, testID }: CardProps) {
  const { reducedMotion } = useTheme();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 6)).current;

  useEffect(() => {
    if (reducedMotion) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [reducedMotion, opacity, translateY]);

  return (
    <Animated.View style={[styles.card, style, { opacity, transform: [{ translateY }] }]} testID={testID}>
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, titleStyle]}>{title}</Text>
          {right}
        </View>
      )}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    padding: 16,
    backgroundColor: colors.neutral.card,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    marginBottom: 14,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text.primary,
  },
});
