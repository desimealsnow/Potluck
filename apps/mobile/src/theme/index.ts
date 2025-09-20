/**
 * Centralized theme system for the mobile app
 * Now token-driven to match .design/tokens.json
 */

// Token surface for RN consumers
export type DesignTokens = {
  brand: { primary: string; primaryAlt: string; secondary: string; accent: string };
  neutral: { bg: string; bgAlt: string; card: string; muted: string; line: string; white: string; black: string };
  state: { success: string; warning: string; error: string; info: string };
  radius: { sm: number; md: number; lg: number; xl: number };
  shadow: { sm: string; md: string };
  space: number[];
  font: { display: { family: string; weight: number }; ui: { family: string; weight: number } };
};

// Default tokens as a TS export (kept in sync with .design/tokens.json)
export const tokens: DesignTokens = {
  brand: {
    primary: '#7C3AED',
    primaryAlt: '#EC4899',
    secondary: '#10B981',
    accent: '#F59E0B',
  },
  neutral: {
    bg: '#0B1020',
    bgAlt: '#0F1529',
    card: '#121a33',
    muted: '#94A3B8',
    line: '#1E293B',
    white: '#FFFFFF',
    black: '#000000',
  },
  state: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#38BDF8',
  },
  radius: { sm: 6, md: 12, lg: 16, xl: 24 },
  shadow: {
    sm: '0 2px 8px rgba(0,0,0,0.15)',
    md: '0 8px 24px rgba(0,0,0,0.25)'
  },
  space: [0, 4, 8, 12, 16, 20, 24, 32, 40],
  font: {
    display: { family: 'Manrope', weight: 700 },
    ui: { family: 'Inter', weight: 500 },
  },
};

// Derived RN colors from tokens
export const colors = {
  primary: {
    main: tokens.brand.primary,
    alt: tokens.brand.primaryAlt,
    secondary: tokens.brand.secondary,
    accent: tokens.brand.accent,
  },
  neutral: {
    bg: tokens.neutral.bg,
    bgAlt: tokens.neutral.bgAlt,
    card: tokens.neutral.card,
    muted: tokens.neutral.muted,
    line: tokens.neutral.line,
    white: tokens.neutral.white,
    black: tokens.neutral.black,
  },
  state: tokens.state,
  text: {
    primary: tokens.neutral.white,
    secondary: 'rgba(255,255,255,0.82)',
    muted: 'rgba(255,255,255,0.64)',
    inverse: tokens.neutral.black,
  },
  border: {
    subtle: 'rgba(255,255,255,0.08)',
    strong: 'rgba(255,255,255,0.16)',
  },
} as const;

export const gradients = {
  header: {
    event: [tokens.brand.primary, tokens.brand.primaryAlt] as const,
  },
  button: {
    primary: [tokens.brand.primary, tokens.brand.primaryAlt] as const,
  },
} as const;

export const typography = {
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  
  // Font weights
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const spacing = {
  xs: tokens.space[1],
  sm: tokens.space[2],
  md: tokens.space[3],
  lg: tokens.space[4],
  xl: tokens.space[5],
  '2xl': tokens.space[6],
  '3xl': tokens.space[7],
  '4xl': tokens.space[8],
  '5xl': 48,
  '6xl': 64,
} as const;

export const borderRadius = {
  none: 0,
  sm: tokens.radius.sm,
  md: tokens.radius.md,
  lg: tokens.radius.lg,
  xl: tokens.radius.xl,
  '2xl': Math.max(tokens.radius.xl, tokens.radius.lg + 4),
  '3xl': Math.max(tokens.radius.xl + 4, 28),
  full: 9999,
} as const;

export const shadows = {
  sm: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 },
  lg: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 6 },
  xl: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 16, elevation: 10 },
} as const;

// Chip tone mappings
export const chipTones = {
  sky: { background: 'rgba(56,189,248,0.18)', text: '#EAF2FF' },
  emerald: { background: 'rgba(16,185,129,0.22)', text: '#E8FFF4' },
  violet: { background: 'rgba(124,58,237,0.22)', text: '#F0E9FF' },
  peach: { background: 'rgba(245,158,11,0.22)', text: '#FFEFD6' },
  indigo: { background: 'rgba(99,102,241,0.22)', text: '#E7E9FF' },
} as const;

// Pill tone mappings
export const pillTones = {
  green: { background: 'rgba(34,197,94,0.18)', text: '#E8FFF4' },
  amber: { background: 'rgba(245,158,11,0.18)', text: '#FFF7E6' },
  rose: { background: 'rgba(236,72,153,0.18)', text: '#FFE8F3' },
  indigo: { background: 'rgba(99,102,241,0.18)', text: '#E7E9FF' },
} as const;

// Badge tone mappings
export const badgeTones = {
  peach: { background: 'rgba(245,158,11,0.28)', text: '#FFEFD6' },
  indigo: { background: 'rgba(124,58,237,0.28)', text: '#F0E9FF' },
} as const;

// Theme objects and provider
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { Appearance, ColorSchemeName, AccessibilityInfo } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';
export type Theme = {
  tokens: DesignTokens;
  colors: typeof colors;
  spacing: typeof spacing;
  typography: typeof typography;
  borderRadius: typeof borderRadius;
  shadows: typeof shadows;
  gradients: typeof gradients;
  colorScheme: Exclude<ColorSchemeName, null>;
  reducedMotion: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<Theme | undefined>(undefined);

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export function ThemeProvider({ children, mode: initialMode = 'system' as ThemeMode }: { children: React.ReactNode; mode?: ThemeMode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const [scheme, setScheme] = useState<Exclude<ColorSchemeName, null>>((Appearance.getColorScheme() || 'dark') as Exclude<ColorSchemeName, null>);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  useEffect(() => {
    // Reduced motion
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion).catch(() => {});
    const rmSub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    return () => {
      try { rmSub.remove(); } catch {}
    };
  }, []);

  useEffect(() => {
    if (mode !== 'system') {
      setScheme(mode);
      return;
    }
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setScheme((colorScheme || 'dark') as Exclude<ColorSchemeName, null>);
    });
    return () => sub.remove();
  }, [mode]);

  const theme = useMemo<Theme>(() => {
    return {
      tokens,
      colors,
      spacing,
      typography,
      borderRadius,
      shadows,
      gradients,
      colorScheme: scheme,
      reducedMotion,
      mode,
      setMode,
    };
  }, [scheme, reducedMotion, mode]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

// Category color mapping
export const categoryColors = {
  Appetizer: '#06B6D4',
  Main: '#22C55E',
  Side: '#84CC16',
  Dessert: '#F472B6',
  Beverage: '#38BDF8',
  Supplies: '#F59E0B',
} as const;
