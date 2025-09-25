import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Animated,
  Platform,
  Pressable,
  TextInputProps,
  ViewStyle,
  TextStyle,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Icon } from './Icon';
import { vibrantTheme } from '@/theme/vibrant-theme';
import { rw, rh, rf, rs, getResponsiveStyles } from '@/utils/responsive';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const theme = vibrantTheme;
const responsive = getResponsiveStyles();

export interface InputEnhancedProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  variant?: 'default' | 'filled' | 'outlined' | 'glass';
  size?: 'small' | 'medium' | 'large';
  rounded?: boolean;
  animated?: boolean;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  errorStyle?: TextStyle;
  hintStyle?: TextStyle;
}

export function InputEnhanced({
  label,
  error,
  hint,
  icon,
  rightIcon,
  onRightIconPress,
  variant = 'default',
  size = 'medium',
  rounded = false,
  animated = true,
  containerStyle,
  inputStyle,
  labelStyle,
  errorStyle,
  hintStyle,
  onFocus,
  onBlur,
  value,
  ...textInputProps
}: InputEnhancedProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!value);
  
  // Animation values
  const focusAnim = useRef(new Animated.Value(0)).current;
  const errorShakeAnim = useRef(new Animated.Value(0)).current;
  const labelPositionAnim = useRef(new Animated.Value(hasValue ? 1 : 0)).current;
  
  // Size configurations
  const sizeConfig = {
    small: {
      height: responsive.inputHeight * 0.85,
      fontSize: responsive.fontSize.sm,
      iconSize: rf(16),
      paddingHorizontal: rw(12),
    },
    medium: {
      height: responsive.inputHeight,
      fontSize: responsive.fontSize.base,
      iconSize: rf(20),
      paddingHorizontal: rw(16),
    },
    large: {
      height: responsive.inputHeight * 1.15,
      fontSize: responsive.fontSize.md,
      iconSize: rf(24),
      paddingHorizontal: rw(20),
    },
  };
  
  // Variant configurations
  const variantConfig = {
    default: {
      backgroundColor: theme.colors.background.card,
      borderColor: theme.colors.border.light,
      focusBorderColor: theme.colors.primary.main,
    },
    filled: {
      backgroundColor: theme.colors.background.tertiary,
      borderColor: 'transparent',
      focusBorderColor: theme.colors.primary.main,
    },
    outlined: {
      backgroundColor: 'transparent',
      borderColor: theme.colors.border.medium,
      focusBorderColor: theme.colors.primary.main,
    },
    glass: {
      backgroundColor: 'rgba(255,255,255,0.1)',
      borderColor: 'rgba(255,255,255,0.2)',
      focusBorderColor: theme.colors.primary.main,
    },
  };
  
  const config = variantConfig[variant];
  const sizeStyles = sizeConfig[size];
  
  // Handle focus
  const handleFocus = useCallback((e: any) => {
    setIsFocused(true);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (animated) {
      Animated.parallel([
        Animated.spring(focusAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: false,
        }),
        Animated.timing(labelPositionAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
    
    onFocus?.(e);
  }, [animated, onFocus]);
  
  // Handle blur
  const handleBlur = useCallback((e: any) => {
    setIsFocused(false);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    if (animated) {
      Animated.parallel([
        Animated.spring(focusAnim, {
          toValue: 0,
          tension: 50,
          friction: 7,
          useNativeDriver: false,
        }),
        !hasValue && Animated.timing(labelPositionAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ].filter(Boolean) as Animated.CompositeAnimation[]).start();
    }
    
    onBlur?.(e);
  }, [animated, hasValue, onBlur]);
  
  // Handle text change
  const handleChangeText = useCallback((text: string) => {
    setHasValue(text.length > 0);
    textInputProps.onChangeText?.(text);
  }, [textInputProps.onChangeText]);
  
  // Shake animation for errors
  React.useEffect(() => {
    if (error && animated) {
      Animated.sequence([
        Animated.timing(errorShakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(errorShakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [error, animated]);
  
  // Animated styles
  const animatedContainerStyle = {
    transform: [{ translateX: errorShakeAnim }],
    borderColor: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [
        error ? theme.colors.state.error : config.borderColor,
        error ? theme.colors.state.error : config.focusBorderColor,
      ],
    }),
    borderWidth: focusAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2],
    }),
  };
  
  const animatedLabelStyle = label && animated ? {
    position: 'absolute' as const,
    left: icon ? rw(40) : sizeStyles.paddingHorizontal,
    top: labelPositionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [sizeStyles.height / 2 - rf(9), -rf(10)],
    }),
    fontSize: labelPositionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [sizeStyles.fontSize, rf(12)],
    }),
    color: labelPositionAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [theme.colors.text.muted, theme.colors.primary.main],
    }),
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: rw(4),
  } : undefined;
  
  const inputContent = (
    <>
      {icon && (
        <View style={styles.iconContainer}>
          <Icon 
            name={icon as any} 
            size={sizeStyles.iconSize} 
            color={isFocused ? theme.colors.primary.main : theme.colors.text.muted}
          />
        </View>
      )}
      
      <TextInput
        {...textInputProps}
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[
          styles.input,
          {
            fontSize: sizeStyles.fontSize,
            color: theme.colors.text.primary,
            paddingRight: rightIcon ? rw(40) : sizeStyles.paddingHorizontal,
          },
          inputStyle,
        ]}
        placeholderTextColor={theme.colors.text.muted}
      />
      
      {rightIcon && (
        <Pressable 
          onPress={onRightIconPress}
          style={styles.rightIconContainer}
        >
          <Icon 
            name={rightIcon as any} 
            size={sizeStyles.iconSize} 
            color={theme.colors.text.secondary}
          />
        </Pressable>
      )}
    </>
  );
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && !animated && (
        <Text style={[styles.staticLabel, { fontSize: rf(14) }, labelStyle]}>
          {label}
        </Text>
      )}
      
      <Animated.View
        style={[
          styles.inputContainer,
          {
            height: sizeStyles.height,
            backgroundColor: config.backgroundColor,
            borderRadius: rounded ? sizeStyles.height / 2 : rs(12),
            paddingHorizontal: icon ? 0 : sizeStyles.paddingHorizontal,
          },
          animated ? animatedContainerStyle : {
            borderColor: error ? theme.colors.state.error : (isFocused ? config.focusBorderColor : config.borderColor),
            borderWidth: isFocused ? 2 : 1,
          },
        ]}
      >
        {variant === 'glass' && Platform.OS === 'ios' ? (
          <BlurView 
            intensity={80} 
            tint="light" 
            style={styles.blurContent}
          >
            {inputContent}
          </BlurView>
        ) : (
          inputContent
        )}
      </Animated.View>
      
      {label && animated && (
        <Animated.Text style={[styles.animatedLabel, animatedLabelStyle, labelStyle]}>
          {label}
        </Animated.Text>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="AlertCircle" size={rf(14)} color={theme.colors.state.error} />
          <Text style={[styles.errorText, { fontSize: rf(12) }, errorStyle]}>
            {error}
          </Text>
        </View>
      )}
      
      {hint && !error && (
        <Text style={[styles.hintText, { fontSize: rf(12) }, hintStyle]}>
          {hint}
        </Text>
      )}
    </View>
  );
}

// Search Input variant with built-in search icon and clear button
export function SearchInputEnhanced({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search...',
  ...props
}: {
  value: string;
  onChangeText: (text: string) => void;
  onClear?: () => void;
  placeholder?: string;
} & Omit<InputEnhancedProps, 'value' | 'onChangeText'>) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: value.length > 0 ? 1 : 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [value]);
  
  const handleClear = useCallback(() => {
    onChangeText('');
    onClear?.();
  }, [onChangeText, onClear]);
  
  return (
    <View style={styles.searchContainer}>
      <InputEnhanced
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        icon="Search"
        rightIcon={value.length > 0 ? "X" : undefined}
        onRightIconPress={handleClear}
        variant="filled"
        rounded
      />
      
      {value.length > 0 && (
        <Animated.View
          style={[
            styles.searchBadge,
            {
              opacity: slideAnim,
              transform: [{ scale: slideAnim }],
            },
          ]}
        >
          <LinearGradient
            colors={theme.gradients.button.primary}
            style={styles.searchBadgeGradient}
          >
            <Text style={styles.searchBadgeText}>{value.length}</Text>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: rh(8),
  },
  staticLabel: {
    color: theme.colors.text.primary,
    fontWeight: theme.typography.weights.medium,
    marginBottom: rh(6),
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  blurContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontWeight: theme.typography.weights.medium,
  },
  iconContainer: {
    paddingHorizontal: rw(12),
  },
  rightIconContainer: {
    paddingHorizontal: rw(12),
  },
  animatedLabel: {
    zIndex: 1,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rh(4),
  },
  errorText: {
    color: theme.colors.state.error,
    marginLeft: rw(4),
  },
  hintText: {
    color: theme.colors.text.muted,
    marginTop: rh(4),
  },
  searchContainer: {
    position: 'relative',
  },
  searchBadge: {
    position: 'absolute',
    top: -rh(8),
    right: rw(8),
    zIndex: 1,
  },
  searchBadgeGradient: {
    width: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBadgeText: {
    color: '#FFFFFF',
    fontSize: rf(10),
    fontWeight: theme.typography.weights.bold,
  },
});

export default InputEnhanced;