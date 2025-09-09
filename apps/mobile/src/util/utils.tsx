// Cross-platform utility function that mimics clsx/cn behavior
// This works for both React Native and web platforms

export type ClassValue = string | number | boolean | undefined | null | ClassValue[];

export function clsx(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  
  for (const input of inputs) {
    if (!input) continue;
    
    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const result = clsx(...input);
      if (result) classes.push(result);
    } else if (typeof input === 'object') {
      for (const [key, value] of Object.entries(input)) {
        if (value) classes.push(key);
      }
    }
  }
  
  return classes.join(' ');
}

// Cross-platform cn function (class names utility)
// For React Native, this just returns a concatenated string
// For web, you could enhance this to work with Tailwind if needed
export function cn(...inputs: ClassValue[]): string {
  return clsx(...inputs);
}

// Additional utility functions for cross-platform development
export const validateEmail = (email: string): boolean => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const capitalizeFirstLetter = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Platform-specific utilities
import { Platform } from 'react-native';

export const isWeb = Platform.OS === 'web';
export const isIOS = Platform.OS === 'ios';
export const isAndroid = Platform.OS === 'android';
