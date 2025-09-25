import React, { useRef, useCallback } from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  Animated,
  Platform,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  AccessibilityRole,
  GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { vibrantTheme } from '@/theme/vibrant-theme';
import { rw, rh, rf, rs, getResponsiveStyles } from '@/utils/responsive';

const theme = vibrantTheme;
const responsive = getResponsiveStyles();

export interface ButtonEnhancedProps {
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: () => void;
  title?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost' | 'glass';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  rounded?: boolean;
  gradient?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: AccessibilityRole;
  testID?: string;
}

export function ButtonEnhanced({
  onPress,
  onLongPress,
  title,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  rounded = false,
  gradient = true,
  haptic = true,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityRole = 'button',
  testID,
}: ButtonEnhancedProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  // Size configurations
  const sizeConfig = {
    small: {
      height: responsive.buttonHeight * 0.8,
      paddingHorizontal: rw(12),
      fontSize: responsive.fontSize.sm,
      iconSize: rf(14),
    },
    medium: {
      height: responsive.buttonHeight,
      paddingHorizontal: rw(20),
      fontSize: responsive.fontSize.base,
      iconSize: rf(18),
    },
    large: {
      height: responsive.buttonHeight * 1.2,
      paddingHorizontal: rw(28),
      fontSize: responsive.fontSize.lg,
      iconSize: rf(22),
    },
  };
  
  // Variant configurations
  const variantConfig = {
    primary: {
      gradient: theme.gradients.button.primary,
      backgroundColor: theme.colors.primary.main,
      textColor: '#FFFFFF',
      borderColor: 'transparent',
    },
    secondary: {
      gradient: theme.gradients.button.secondary,
      backgroundColor: theme.colors.secondary.blue,
      textColor: '#FFFFFF',
      borderColor: 'transparent',
    },
    success: {
      gradient: theme.gradients.button.success,
      backgroundColor: theme.colors.state.success,
      textColor: '#FFFFFF',
      borderColor: 'transparent',
    },
    danger: {
      gradient: ['#FFB4B4', '#FC5C65'],
      backgroundColor: theme.colors.state.error,
      textColor: '#FFFFFF',
      borderColor: 'transparent',
    },
    ghost: {
      gradient: ['transparent', 'transparent'],
      backgroundColor: 'transparent',
      textColor: theme.colors.text.primary,
      borderColor: theme.colors.border.light,
    },
    glass: {
      gradient: ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'],
      backgroundColor: 'rgba(255,255,255,0.1)',
      textColor: theme.colors.text.primary,
      borderColor: 'rgba(255,255,255,0.2)',
    },
  };
  
  const config = variantConfig[variant];
  const sizeStyles = sizeConfig[size];
  
  // Animation handlers
  const handlePressIn = useCallback(() => {
    if (disabled || loading) return;
    
    if (haptic && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        tension: 100,
        friction: 10,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [disabled, loading, haptic]);
  
  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const handlePress = useCallback((event: GestureResponderEvent) => {
    if (disabled || loading) return;
    
    if (haptic) {
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        // Android vibration
        const Vibration = require('react-native').Vibration;
        Vibration.vibrate(10);
      }
    }
    
    onPress?.(event);
  }, [disabled, loading, haptic, onPress]);
  
  const animatedStyle = {
    transform: [
      { scale: scaleAnim },
      {
        rotate: rotateAnim.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '1deg'],
        }),
      },
    ],
  };
  
  const containerStyle: ViewStyle = {
    height: sizeStyles.height,
    paddingHorizontal: sizeStyles.paddingHorizontal,
    borderRadius: rounded ? sizeStyles.height / 2 : rs(12),
    width: fullWidth ? '100%' : undefined,
    opacity: disabled ? 0.5 : 1,
    borderWidth: variant === 'ghost' || variant === 'glass' ? 1 : 0,
    borderColor: config.borderColor,
    overflow: 'hidden',
    ...style,
  };
  
  const buttonContent = (
    <>
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={config.textColor}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <Icon 
              name={icon as any} 
              size={sizeStyles.iconSize} 
              color={config.textColor}
              style={{ marginRight: rw(8) }}
            />
          )}
          {title && (
            <Text 
              style={[
                styles.text,
                {
                  fontSize: sizeStyles.fontSize,
                  color: config.textColor,
                },
                textStyle,
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {icon && iconPosition === 'right' && (
            <Icon 
              name={icon as any} 
              size={sizeStyles.iconSize} 
              color={config.textColor}
              style={{ marginLeft: rw(8) }}
            />
          )}
        </>
      )}
    </>
  );
  
  return (
    <Animated.View style={[animatedStyle, containerStyle]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={onLongPress}
        disabled={disabled || loading}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityRole={accessibilityRole}
        accessibilityState={{
          disabled: disabled || loading,
          busy: loading,
        }}
        testID={testID}
        style={styles.pressable}
      >
        {variant === 'glass' && Platform.OS === 'ios' ? (
          <BlurView 
            intensity={80} 
            tint="light" 
            style={styles.content}
          >
            {buttonContent}
          </BlurView>
        ) : gradient && variant !== 'ghost' ? (
          <LinearGradient
            colors={config.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.content}
          >
            {buttonContent}
          </LinearGradient>
        ) : (
          <View 
            style={[
              styles.content,
              { backgroundColor: config.backgroundColor }
            ]}
          >
            {buttonContent}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// Animated Icon Button variant
export function IconButtonEnhanced({
  onPress,
  icon,
  size = 'medium',
  variant = 'ghost',
  haptic = true,
  style,
  testID,
}: {
  onPress?: () => void;
  icon: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass';
  haptic?: boolean;
  style?: ViewStyle;
  testID?: string;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  
  const sizeMap = {
    small: rs(32),
    medium: rs(40),
    large: rs(48),
  };
  
  const iconSizeMap = {
    small: rf(16),
    medium: rf(20),
    large: rf(24),
  };
  
  const handlePressIn = useCallback(() => {
    if (haptic && Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [haptic]);
  
  const handlePressOut = useCallback(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const variantColors = {
    primary: theme.colors.primary.main,
    secondary: theme.colors.secondary.blue,
    ghost: theme.colors.text.secondary,
    glass: theme.colors.text.primary,
  };
  
  return (
    <Animated.View
      style={[
        {
          width: sizeMap[size],
          height: sizeMap[size],
          transform: [
            { scale: scaleAnim },
            {
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '180deg'],
              }),
            },
          ],
        },
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.iconButton,
          {
            backgroundColor: variant === 'ghost' ? 'transparent' : variantColors[variant] + '20',
            borderRadius: sizeMap[size] / 2,
          },
        ]}
        testID={testID}
      >
        <Icon 
          name={icon as any} 
          size={iconSizeMap[size]} 
          color={variantColors[variant]}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: theme.typography.weights.semibold,
  },
  iconButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// For React Native's View import
import { View } from 'react-native';

export default ButtonEnhanced;