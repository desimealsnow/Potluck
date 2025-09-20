/**
 * Cross-platform theme using semantic tokens from .design/tokens.json
 */
import tokensJson from '../../../../.design/tokens.json';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName, useColorScheme } from 'react-native';

export type DesignTokens = typeof tokensJson;
export const tokens: DesignTokens = tokensJson;

export type ThemeMode = 'light' | 'dark' | 'system';

export type ThemeColors = {
  background: string;
  backgroundAlt: string;
  card: string;
  text: string;
  textMuted: string;
  line: string;
  brand: string;
  brandAlt: string;
  success: string;
  warning: string;
  error: string;
  info: string;
  white: string;
  black: string;
};

export type Theme = {
  mode: Exclude<ColorSchemeName, 'no-preference'>;
  colors: ThemeColors;
  radius: typeof tokens.radius;
  shadow: typeof tokens.shadow;
  space: typeof tokens.space;
  font: typeof tokens.font;
  gradients: {
    brand45: readonly [string, string];
  };
};

function resolveMode(mode: ThemeMode): Exclude<ColorSchemeName, 'no-preference'> {
  if (mode === 'system') return Appearance.getColorScheme() || 'light';
  return mode;
}

export function createTheme(mode: ThemeMode = 'system'): Theme {
  const m = resolveMode(mode);
  const isDark = m === 'dark';
  const c = tokens;
  const colors: ThemeColors = {
    background: isDark ? c.neutral.bg : c.neutral.white,
    backgroundAlt: isDark ? c.neutral.bgAlt : '#F8FAFC',
    card: isDark ? c.neutral.card : '#FFFFFF',
    text: isDark ? c.neutral.white : '#0F172A',
    textMuted: c.neutral.muted,
    line: isDark ? c.neutral.line : 'rgba(15, 23, 42, 0.08)',
    brand: c.brand.primary,
    brandAlt: c.brand.primaryAlt,
    success: c.state.success,
    warning: c.state.warning,
    error: c.state.error,
    info: c.state.info,
    white: c.neutral.white,
    black: c.neutral.black,
  };
  return {
    mode: m,
    colors,
    radius: c.radius,
    shadow: c.shadow,
    space: c.space,
    font: c.font,
    gradients: {
      brand45: [c.brand.primary, c.brand.primaryAlt] as const,
    },
  };
}

// Simple mutable singleton theme for RN (can be swapped by provider later)
let currentTheme: Theme = createTheme('system');
export function setTheme(mode: ThemeMode) { currentTheme = createTheme(mode); }
export function getTheme(): Theme { return currentTheme; }

// Category color mapping
export const categoryColors = {
  Appetizer: '#06B6D4',
  Main: '#22C55E',
  Side: '#84CC16',
  Dessert: '#F472B6',
  Beverage: '#38BDF8',
  Supplies: '#F59E0B',
} as const;

// Utility helpers for components
export const ui = {
  button: {
    base: () => ({
      borderRadius: currentTheme.radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      flexDirection: 'row' as const,
      gap: 8,
      minHeight: 48,
      paddingHorizontal: 16,
      paddingVertical: 12,
    }),
    solid: () => ({ backgroundColor: currentTheme.colors.brand }),
    outline: () => ({ borderWidth: 1, borderColor: currentTheme.colors.line, backgroundColor: 'transparent' }),
    ghost: () => ({ backgroundColor: 'transparent' }),
    danger: () => ({ backgroundColor: currentTheme.colors.error }),
    text: () => ({ color: currentTheme.colors.white, fontFamily: currentTheme.font.ui.family, fontWeight: '700' as const }),
  },
  card: {
    base: () => ({
      borderRadius: currentTheme.radius.lg,
      padding: 16,
      backgroundColor: currentTheme.colors.card,
      borderWidth: 1,
      borderColor: currentTheme.colors.line,
    }),
    title: () => ({
      color: currentTheme.colors.text,
      fontFamily: currentTheme.font.display.family,
      fontWeight: '700' as const,
      fontSize: 18,
    }),
  },
};

// React context provider for theme, with system/dark mode support
const ThemeContext = createContext<Theme>(currentTheme);

export function ThemeProvider({ children, mode = 'system' as ThemeMode }: { children: React.ReactNode; mode?: ThemeMode }) {
  const system = useColorScheme();
  const resolved = mode === 'system' ? (system || 'light') : mode;
  const [theme, setThemeState] = useState<Theme>(() => createTheme(resolved));

  useEffect(() => {
    const next = createTheme(resolved);
    setThemeState(next);
    setTheme(resolved);
  }, [resolved]);

  const value = useMemo(() => theme, [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme { return useContext(ThemeContext); }

