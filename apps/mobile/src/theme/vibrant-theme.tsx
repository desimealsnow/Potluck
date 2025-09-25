/**
 * Vibrant and Cheerful Theme System for Potluck App
 * A more colorful, energetic, and eventful design system
 */

import { Platform } from 'react-native';

// Vibrant Color Palette - More cheerful and eventful
export const vibrantColors = {
  // Primary Brand Colors - Bright and energetic
  primary: {
    main: '#FF6B6B',      // Coral Red - Main brand color (energetic & inviting)
    light: '#FFE5E5',     // Light coral for backgrounds
    dark: '#E55555',      // Darker coral for emphasis
    gradient: ['#FF6B6B', '#FF8E53'], // Coral to Orange gradient
  },
  
  // Secondary Colors - Complementary vibrant tones
  secondary: {
    purple: '#9F7AEA',    // Soft purple for accents
    blue: '#4ECDC4',      // Turquoise for highlights
    green: '#95E1A4',     // Mint green for success states
    yellow: '#FFD93D',    // Sunny yellow for celebration
    pink: '#FF6BCB',      // Hot pink for special elements
  },
  
  // Background Colors - Light and airy
  background: {
    primary: '#FFFFFF',    // Clean white background
    secondary: '#FFF9F5',  // Warm off-white
    tertiary: '#F7FAFC',   // Cool gray-white
    gradient: ['#FFF5F5', '#FFF0E6'], // Subtle warm gradient
    card: '#FFFFFF',       // White cards with shadows
  },
  
  // Event-specific Colors
  event: {
    upcoming: '#4ECDC4',   // Turquoise for upcoming events
    active: '#95E1A4',     // Mint green for active
    past: '#B4A7D6',       // Soft lavender for past
    draft: '#FFD93D',      // Yellow for drafts
    cancelled: '#FFB4B4',  // Soft red for cancelled
  },
  
  // Food/Diet Colors - More appetizing
  diet: {
    veg: {
      bg: '#95E1A4',       // Fresh mint green
      text: '#2D5F3F',     // Deep green text
      accent: '#6BCF7F',   // Bright green accent
    },
    nonveg: {
      bg: '#FFB088',       // Warm peach
      text: '#8B4513',     // Brown text
      accent: '#FF8E53',   // Orange accent
    },
    mixed: {
      bg: '#B4A7D6',       // Soft purple
      text: '#4A3C6B',     // Deep purple text
      accent: '#9F7AEA',   // Purple accent
    },
  },
  
  // UI Elements
  text: {
    primary: '#2D3748',    // Dark gray for main text
    secondary: '#718096',  // Medium gray for secondary
    muted: '#A0AEC0',      // Light gray for muted
    inverse: '#FFFFFF',    // White text on dark backgrounds
    accent: '#FF6B6B',     // Coral for emphasis
  },
  
  // State Colors
  state: {
    success: '#48BB78',    // Green
    warning: '#FFD93D',    // Yellow
    error: '#FC5C65',      // Red
    info: '#4ECDC4',       // Turquoise
  },
  
  // Borders and Shadows
  border: {
    light: '#E2E8F0',      // Light gray border
    medium: '#CBD5E0',     // Medium gray border
    accent: '#FFE5E5',     // Light coral border
  },
  
  shadow: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.1)',
    colored: 'rgba(255, 107, 107, 0.15)', // Colored shadow for depth
  },
};

// Gradients for more visual interest
export const vibrantGradients = {
  // Header gradients
  header: {
    primary: ['#FF6B6B', '#FF8E53'],     // Coral to orange
    secondary: ['#4ECDC4', '#95E1A4'],   // Turquoise to mint
    celebration: ['#FFD93D', '#FFB088'],  // Yellow to peach
    evening: ['#9F7AEA', '#FF6BCB'],     // Purple to pink
  },
  
  // Button gradients
  button: {
    primary: ['#FF6B6B', '#FF8E53'],
    secondary: ['#4ECDC4', '#56CCF2'],
    success: ['#95E1A4', '#6BCF7F'],
    special: ['#9F7AEA', '#FF6BCB'],
  },
  
  // Card backgrounds
  card: {
    subtle: ['#FFFFFF', '#FFF9F5'],
    highlight: ['#FFE5E5', '#FFF0E6'],
    special: ['#F0E6FF', '#E6F7FF'],
  },
};

// Typography with more personality
export const vibrantTypography = {
  fonts: {
    display: Platform.select({
      ios: 'Avenir-Heavy',
      android: 'Roboto',
      default: 'System',
    }),
    heading: Platform.select({
      ios: 'Avenir-Medium',
      android: 'Roboto',
      default: 'System',
    }),
    body: Platform.select({
      ios: 'System',
      android: 'Roboto',
      default: 'System',
    }),
  },
  
  sizes: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    '2xl': 28,
    '3xl': 34,
    '4xl': 42,
  },
  
  weights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
};

// Border radius for softer, friendlier shapes
export const vibrantBorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
  card: 20,    // Rounded cards
  button: 25,  // Very rounded buttons
  chip: 16,    // Pills and chips
};

// Shadows for depth and dimension
export const vibrantShadows = {
  none: {},
  sm: {
    ...Platform.select({
      ios: {
        shadowColor: vibrantColors.primary.main,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  md: {
    ...Platform.select({
      ios: {
        shadowColor: vibrantColors.primary.main,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  lg: {
    ...Platform.select({
      ios: {
        shadowColor: vibrantColors.primary.main,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  colored: {
    ...Platform.select({
      ios: {
        shadowColor: vibrantColors.primary.main,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
};

// Animation configurations
export const vibrantAnimations = {
  spring: {
    tension: 40,
    friction: 7,
  },
  timing: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    bounce: 'bounce',
    ease: 'ease',
    elastic: 'elastic',
  },
};

// Spacing system
export const vibrantSpacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
};

// Icon configurations
export const vibrantIcons = {
  sizes: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 28,
    xl: 32,
    '2xl': 40,
  },
  colors: {
    primary: vibrantColors.primary.main,
    secondary: vibrantColors.secondary.blue,
    success: vibrantColors.state.success,
    warning: vibrantColors.state.warning,
    error: vibrantColors.state.error,
    muted: vibrantColors.text.muted,
  },
};

// Export complete theme object
export const vibrantTheme = {
  colors: vibrantColors,
  gradients: vibrantGradients,
  typography: vibrantTypography,
  borderRadius: vibrantBorderRadius,
  shadows: vibrantShadows,
  animations: vibrantAnimations,
  spacing: vibrantSpacing,
  icons: vibrantIcons,
};

export default vibrantTheme;