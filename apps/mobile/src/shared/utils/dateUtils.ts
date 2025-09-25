/**
 * Platform-adaptive date utilities
 */

// Platform-specific date picker imports
import { Platform } from 'react-native';

// Web date picker (for web platform)
const WebDatePicker = Platform.OS === 'web' 
  ? require('react-native-paper-dates').DatePickerModal 
  : null;

// Native date picker (for iOS/Android)
const NativeDatePicker = Platform.OS !== 'web'
  ? require('@react-native-community/datetimepicker').default
  : null;

export type DateFormat = 'short' | 'medium' | 'long' | 'full';

export type TimeFormat = '12h' | '24h';

export interface DateFormatOptions {
  format?: DateFormat;
  timeFormat?: TimeFormat;
  includeTime?: boolean;
  locale?: string;
}

/**
 * Format a date for display
 */
export function formatDate(
  date: Date | undefined, 
  options: DateFormatOptions = {}
): string {
  if (!date) return "Select date";
  
  const {
    format = 'short',
    timeFormat = '24h',
    includeTime = false,
    locale = 'en-GB'
  } = options;

  const dateOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  };

  if (includeTime) {
    dateOptions.hour = '2-digit';
    dateOptions.minute = '2-digit';
    dateOptions.hour12 = timeFormat === '12h';
  }

  switch (format) {
    case 'short':
      return date.toLocaleDateString(locale, dateOptions);
    case 'medium':
      return date.toLocaleDateString(locale, {
        ...dateOptions,
        weekday: 'short',
        month: 'short',
      });
    case 'long':
      return date.toLocaleDateString(locale, {
        ...dateOptions,
        weekday: 'long',
        month: 'long',
      });
    case 'full':
      return date.toLocaleDateString(locale, {
        ...dateOptions,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    default:
      return date.toLocaleDateString(locale, dateOptions);
  }
}

/**
 * Format time for display
 */
export function formatTime(
  date: Date | undefined, 
  options: { timeFormat?: TimeFormat; locale?: string } = {}
): string {
  if (!date) return "Select time";
  
  const { timeFormat = '24h', locale = 'en-GB' } = options;
  
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
  });
}

/**
 * Format date and time range
 */
export function formatDateTimeRange(
  startDate: Date | undefined,
  endDate: Date | undefined,
  options: DateFormatOptions = {}
): string {
  if (!startDate) return "Select date";
  
  const { format = 'medium', timeFormat = '12h', locale = 'en-GB' } = options;
  
  const dateStr = formatDate(startDate, { format, locale });
  
  if (!endDate || startDate.getTime() === endDate.getTime()) {
    const timeStr = formatTime(startDate, { timeFormat, locale });
    return `${dateStr} • ${timeStr}`;
  }
  
  const startTime = formatTime(startDate, { timeFormat, locale });
  const endTime = formatTime(endDate, { timeFormat, locale });
  
  return `${dateStr} • ${startTime} - ${endTime}`;
}

/**
 * Combine date and time into ISO datetime string
 */
export function combineDateTime(date: Date | undefined, time: Date | undefined): string {
  if (!date || !time) return new Date().toISOString();
  
  const combined = new Date(date);
  combined.setHours(time.getHours());
  combined.setMinutes(time.getMinutes());
  combined.setSeconds(0);
  combined.setMilliseconds(0);
  
  return combined.toISOString();
}

/**
 * Parse ISO string to Date object
 */
export function parseISODate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Get relative time string (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(date: Date | string): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffMs = targetDate.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (Math.abs(diffDays) >= 1) {
    return diffDays > 0 ? `in ${diffDays} day${diffDays > 1 ? 's' : ''}` : `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
  } else if (Math.abs(diffHours) >= 1) {
    return diffHours > 0 ? `in ${diffHours} hour${diffHours > 1 ? 's' : ''}` : `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''} ago`;
  } else if (Math.abs(diffMinutes) >= 1) {
    return diffMinutes > 0 ? `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}` : `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Check if date is today
 */
export function isToday(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  
  return targetDate.getDate() === today.getDate() &&
         targetDate.getMonth() === today.getMonth() &&
         targetDate.getFullYear() === today.getFullYear();
}

/**
 * Check if date is tomorrow
 */
export function isTomorrow(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  return targetDate.getDate() === tomorrow.getDate() &&
         targetDate.getMonth() === tomorrow.getMonth() &&
         targetDate.getFullYear() === tomorrow.getFullYear();
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate.getTime() < new Date().getTime();
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string): boolean {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  return targetDate.getTime() > new Date().getTime();
}

/**
 * Get start of day
 */
export function startOfDay(date: Date | string): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  return targetDate;
}

/**
 * Get end of day
 */
export function endOfDay(date: Date | string): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
  targetDate.setHours(23, 59, 59, 999);
  return targetDate;
}

/**
 * Add days to date
 */
export function addDays(date: Date | string, days: number): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
  targetDate.setDate(targetDate.getDate() + days);
  return targetDate;
}

/**
 * Add hours to date
 */
export function addHours(date: Date | string, hours: number): Date {
  const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
  targetDate.setHours(targetDate.getHours() + hours);
  return targetDate;
}

/**
 * Get days between two dates
 */
export function getDaysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Clamp a number between 0 and 1
 */
export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// Platform-specific date picker components
export const DatePicker = Platform.OS === 'web' ? WebDatePicker : NativeDatePicker;
export const TimePicker = Platform.OS === 'web' 
  ? require('react-native-paper-dates').TimePickerModal 
  : NativeDatePicker;
