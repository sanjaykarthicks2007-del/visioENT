/**
 * Medical-grade design system tokens for SMART ENT ENDOSCOPE (CuraXion)
 *
 * Professional Light Clinical Theme
 * Primary Identity: Teal (#008C95) + Navy (#1B3652) + White (#FFFFFF) + Black (#000000)
 */

import { Platform } from 'react-native';

export const LightClinicalTheme = {
  // Brand Colors (Level 1)
  primary: '#008C95',          // Primary Teal: Interactive actions, buttons, active highlights
  primaryDark: '#1B3652',      // Primary Navy: Headers, brand accents, professional text
  primaryLight: '#E6F4F5',     // Subtle Teal Tint: Patient badges, active chips, subtle fills
  background: '#FFFFFF',       // Main Application Background: Pure White
  surface: '#FFFFFF',          // Card/Surface Background: Pure White
  surfaceSecondary: '#F8FAFC', // Minimal Neutral: Secondary surface, disabled fills
  border: '#E2E8F0',           // Restrained Neutral Border: Clean card borders and separators
  borderFocus: '#008C95',      // Focused Input Border: Primary Teal
  text: '#1B3652',             // Primary Professional Text: Navy
  textStrong: '#000000',       // High-Emphasis Text: Pure Black
  textSecondary: '#4A5568',    // Secondary Clinical Metadata: Slate/Navy
  textMuted: '#718096',        // Muted Placeholder/Helper: Subtle Slate
  // Supporting Semantic Status Indicators (Level 2)
  statusAvailable: '#16A34A',  // Clinical Green: Available / Live stream active / Normal
  statusAvailableBg: '#F0FDF4',
  statusBusy: '#D97706',       // Clinical Amber: In-use / Pending / Waiting for doctor
  statusBusyBg: '#FFFBEB',
  statusOffline: '#64748B',    // Neutral Gray: Offline / Standby
  statusOfflineBg: '#F8FAFC',
  statusActive: '#008C95',     // Primary Teal: Active consultation state
  statusActiveBg: '#E6F4F5',
  statusCompleted: '#16A34A',  // Clinical Green: Completed / Signed off
  statusCompletedBg: '#F0FDF4',
  danger: '#DC2626',           // Clinical Red: Urgent / Severe / Validation error / Disconnect
  dangerBg: '#FEF2F2',
  black: '#000000',            // Pure Black
  white: '#FFFFFF',            // Pure White
} as const;

export const Colors = {
  light: LightClinicalTheme,
  // LIGHT THEME ONLY: dark maps identically to light to guarantee no dark theme leaks
  dark: LightClinicalTheme,
} as const;

export type ThemeColors = typeof Colors.light;
export type ThemeColor = keyof typeof Colors.light;

export const Typography = {
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  bodyBold: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500' as const,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: 13,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

export const Layout = {
  minTouchTarget: 48,
  cardPadding: 16,
  screenPadding: 16,
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});
