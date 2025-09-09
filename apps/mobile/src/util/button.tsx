import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Platform,
} from "react-native";

// Enhanced design system colors matching your Figma design
const colors = {
  primary: "#0f172a",      // Modern dark blue
  primaryForeground: "#f8fafc",
  destructive: "#dc2626",   // Modern red
  destructiveForeground: "#fef2f2",
  background: "#ffffff",
  foreground: "#0f172a",
  accent: "#f1f5f9",
  accentForeground: "#0f172a",
  secondary: "#f1f5f9",
  secondaryForeground: "#0f172a",
  muted: "#f8fafc",
  mutedForeground: "#64748b",
  border: "#e2e8f0",
  input: "#e2e8f0",
  ring: "#0f172a",
};

// Professional button variants matching Figma design system
const buttonVariants = {
  default: {
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    shadowColor: colors.primary,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  destructive: {
    backgroundColor: colors.destructive,
    color: colors.destructiveForeground,
    shadowColor: colors.destructive,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: colors.border,
    borderWidth: 1,
    color: colors.foreground,
    shadowColor: "#000",
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  secondary: {
    backgroundColor: colors.secondary,
    color: colors.secondaryForeground,
    shadowColor: "#000",
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  ghost: {
    backgroundColor: "transparent",
    color: colors.foreground,
  },
  link: {
    backgroundColor: "transparent",
    color: colors.primary,
  },
};

const buttonSizes = {
  default: {
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  sm: {
    height: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  lg: {
    height: 44,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  icon: {
    height: 40,
    width: 40,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 6,
  },
};

interface ButtonProps {
  title?: string;
  onPress: () => void;
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "default",
  size = "default",
  disabled = false,
  style,
  textStyle,
  children,
}) => {
  const variantStyle = buttonVariants[variant];
  const sizeStyle = buttonSizes[size];

  const buttonStyle: ViewStyle = {
    ...sizeStyle,
    backgroundColor: variantStyle.backgroundColor,
    borderColor: (variantStyle as any).borderColor,
    borderWidth: (variantStyle as any).borderWidth || 0,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    // Enhanced shadows and elevation
    ...(Platform.OS === 'ios' ? {
      shadowColor: (variantStyle as any).shadowColor || "#000",
      shadowOffset: (variantStyle as any).shadowOffset || { width: 0, height: 2 },
      shadowOpacity: disabled ? 0 : ((variantStyle as any).shadowOpacity || 0.1),
      shadowRadius: (variantStyle as any).shadowRadius || 4,
    } : {
      elevation: disabled ? 0 : ((variantStyle as any).elevation || 2),
    }),
    // Disabled state
    opacity: disabled ? 0.5 : 1,
    // Smooth transitions
    transform: [{ scale: disabled ? 0.98 : 1 }],
  };

  const textStyleCombined: TextStyle = {
    color: variantStyle.color,
    fontSize: size === "sm" ? 14 : size === "lg" ? 16 : 15,
    fontWeight: "600",
    letterSpacing: 0.5,
    textAlign: "center",
    ...textStyle,
  };

  // Enhanced press feedback
  const handlePressIn = () => {
    // Add subtle press animation if needed
  };

  const handlePressOut = () => {
    // Reset press animation if needed
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={variant === "ghost" || variant === "link" ? 0.6 : 0.8}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {children || <Text style={textStyleCombined}>{title}</Text>}
    </TouchableOpacity>
  );
};

export { Button, buttonVariants };
