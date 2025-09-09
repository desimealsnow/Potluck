/**
 * Centralized theme system for the mobile app
 */

export const colors = {
  // Primary colors
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Secondary colors
  secondary: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
  },
  
  // Neutral colors
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Status colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Semantic colors
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  
  text: {
    primary: '#111827',
    secondary: '#374151',
    tertiary: '#6b7280',
    inverse: '#ffffff',
  },
  
  border: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    strong: 'rgba(0, 0, 0, 0.2)',
  },
} as const;

export const gradients = {
  // Header gradients
  header: {
    warm: ['#FFE0C2', '#FFD4E1', '#FFF0CC'] as const,
    cool: ['#7b2ff7', '#ff2d91', '#ff8a8a'] as const,
    soft: ['#ddd6fe', '#e9d5ff', '#fce7f3'] as const,
  },
  
  // Card gradients
  card: {
    pink: ['#f45bc6', '#f06392', '#e07ac7'] as const,
    blue: ['#3b82f6', '#1d4ed8', '#1e40af'] as const,
    green: ['#10b981', '#059669', '#047857'] as const,
  },
  
  // Button gradients
  button: {
    primary: ['#FF7A00', '#FF3D71'] as const,
    secondary: ['#6b7280', '#4b5563'] as const,
    success: ['#16a34a', '#15803d'] as const,
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
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;

// Chip tone mappings
export const chipTones = {
  sky: {
    background: colors.primary[100],
    text: colors.primary[800],
  },
  emerald: {
    background: colors.success[100],
    text: colors.success[800],
  },
  violet: {
    background: colors.secondary[100],
    text: colors.secondary[800],
  },
  peach: {
    background: 'rgba(255, 214, 194, 0.7)',
    text: '#7A3E00',
  },
  indigo: {
    background: 'rgba(208, 199, 255, 0.8)',
    text: '#3A2A8C',
  },
} as const;

// Pill tone mappings
export const pillTones = {
  green: {
    background: colors.success[100],
    text: colors.success[800],
  },
  amber: {
    background: colors.warning[100],
    text: colors.warning[800],
  },
  rose: {
    background: colors.secondary[100],
    text: colors.secondary[800],
  },
  indigo: {
    background: colors.primary[100],
    text: colors.primary[800],
  },
} as const;

// Badge tone mappings
export const badgeTones = {
  peach: {
    background: 'rgba(255, 214, 194, 0.7)',
    text: '#7A3E00',
  },
  indigo: {
    background: 'rgba(208, 199, 255, 0.8)',
    text: '#3A2A8C',
  },
} as const;
