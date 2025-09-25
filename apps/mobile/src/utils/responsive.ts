/**
 * Responsive Design Utilities for Mobile App
 * Provides responsive scaling and dimension utilities
 */

import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Base dimensions (iPhone 14 Pro as reference)
const baseWidth = 393;
const baseHeight = 852;

// Scale factors
const widthScale = screenWidth / baseWidth;
const heightScale = screenHeight / baseHeight;
const scale = Math.min(widthScale, heightScale);

/**
 * Responsive width - scales based on device width
 */
export const rw = (width: number): number => {
  return Math.round(width * widthScale);
};

/**
 * Responsive height - scales based on device height
 */
export const rh = (height: number): number => {
  return Math.round(height * heightScale);
};

/**
 * Responsive font size - scales based on device with pixel ratio consideration
 */
export const rf = (fontSize: number): number => {
  const newSize = fontSize * scale;
  if (Platform.OS === 'ios') {
    return Math.round(PixelRatio.roundToNearestPixel(newSize));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize)) - 2;
};

/**
 * Responsive spacing - maintains consistent spacing across devices
 */
export const rs = (size: number): number => {
  return Math.round(size * scale);
};

/**
 * Device type detection
 */
export const isSmallDevice = screenWidth < 375;
export const isMediumDevice = screenWidth >= 375 && screenWidth < 414;
export const isLargeDevice = screenWidth >= 414;
export const isTablet = screenWidth >= 768;

/**
 * Safe area padding for different devices
 */
export const getSafeAreaPadding = () => {
  if (Platform.OS === 'ios') {
    return {
      top: isSmallDevice ? 20 : 44,
      bottom: isSmallDevice ? 20 : 34,
    };
  }
  return {
    top: 24,
    bottom: 0,
  };
};

/**
 * Responsive border radius
 */
export const borderRadius = {
  xs: rs(4),
  sm: rs(8),
  md: rs(12),
  lg: rs(16),
  xl: rs(20),
  '2xl': rs(24),
  '3xl': rs(32),
  full: 9999,
  card: rs(20),
  button: rs(25),
  chip: rs(16),
};

/**
 * Responsive shadows with platform-specific adjustments
 */
export const shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: rh(2) },
      shadowOpacity: 0.08,
      shadowRadius: rs(4),
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: rh(4) },
      shadowOpacity: 0.12,
      shadowRadius: rs(8),
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: rh(8) },
      shadowOpacity: 0.16,
      shadowRadius: rs(16),
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
};

/**
 * Get responsive styles based on device size
 */
export const getResponsiveStyles = () => {
  if (isTablet) {
    return {
      containerPadding: rs(24),
      cardPadding: rs(20),
      buttonHeight: rh(56),
      inputHeight: rh(52),
      headerHeight: rh(64),
      fontSize: {
        xs: rf(12),
        sm: rf(14),
        base: rf(16),
        md: rf(18),
        lg: rf(22),
        xl: rf(26),
        '2xl': rf(32),
      },
    };
  }
  
  if (isSmallDevice) {
    return {
      containerPadding: rs(12),
      cardPadding: rs(12),
      buttonHeight: rh(44),
      inputHeight: rh(44),
      headerHeight: rh(56),
      fontSize: {
        xs: rf(10),
        sm: rf(12),
        base: rf(14),
        md: rf(16),
        lg: rf(18),
        xl: rf(22),
        '2xl': rf(26),
      },
    };
  }
  
  // Default (medium devices)
  return {
    containerPadding: rs(16),
    cardPadding: rs(16),
    buttonHeight: rh(48),
    inputHeight: rh(48),
    headerHeight: rh(60),
    fontSize: {
      xs: rf(11),
      sm: rf(13),
      base: rf(15),
      md: rf(17),
      lg: rf(20),
      xl: rf(24),
      '2xl': rf(28),
    },
  };
};

/**
 * Orientation detection
 */
export const isLandscape = screenWidth > screenHeight;
export const isPortrait = screenHeight >= screenWidth;

/**
 * Dynamic dimensions hook helper
 */
export const useDimensions = () => {
  const [dimensions, setDimensions] = React.useState({
    width: screenWidth,
    height: screenHeight,
    isLandscape,
    isPortrait,
  });

  React.useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions({
        width: window.width,
        height: window.height,
        isLandscape: window.width > window.height,
        isPortrait: window.height >= window.width,
      });
    });

    return () => subscription?.remove();
  }, []);

  return dimensions;
};

// Export React for the useDimensions hook
import * as React from 'react';

export default {
  rw,
  rh,
  rf,
  rs,
  isSmallDevice,
  isMediumDevice,
  isLargeDevice,
  isTablet,
  getSafeAreaPadding,
  borderRadius,
  shadows,
  getResponsiveStyles,
  isLandscape,
  isPortrait,
  useDimensions,
  screenWidth,
  screenHeight,
};