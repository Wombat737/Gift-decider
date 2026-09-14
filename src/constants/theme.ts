import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#1C1612',
    background: '#F6EFE7',
    backgroundElement: '#FFFBF6',
    backgroundSelected: '#EADCCE',
    textSecondary: '#6E6258',
    accent: '#C45C4A',
    accentMuted: '#F3D4CC',
    accentText: '#FFF8F4',
    success: '#2F6F52',
    warning: '#9A6B12',
    reserved: '#8A5A2B',
    border: '#E5D6C6',
    overlay: 'rgba(28, 22, 18, 0.42)',
  },
  dark: {
    text: '#F5EDE6',
    background: '#161310',
    backgroundElement: '#241F1B',
    backgroundSelected: '#3A322C',
    textSecondary: '#B0A49A',
    accent: '#E07A68',
    accentMuted: '#4A302C',
    accentText: '#1A1614',
    success: '#7DCE9F',
    warning: '#E6C35C',
    reserved: '#E0B27A',
    border: '#3A322C',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'Georgia',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    display: 'Georgia',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
    display: 'serif',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    display: 'serif',
  },
  web: {
    sans: 'var(--font-sans)',
    serif: 'var(--font-display)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
    display: 'var(--font-display)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const MaxContentWidth = 560;
export const Radius = {
  sm: 12,
  md: 18,
  lg: 24,
  pill: 999,
} as const;

export const CardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#3A2418',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  android: {
    elevation: 3,
  },
  web: {
    boxShadow: '0 14px 40px rgba(58, 36, 24, 0.08)',
  },
  default: {},
}) as ViewStyle;
