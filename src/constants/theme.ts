import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1F1A17',
    background: '#FBF7F2',
    backgroundElement: '#F0E8DE',
    backgroundSelected: '#E5D8C8',
    textSecondary: '#6F655C',
    accent: '#C45C4A',
    accentText: '#FFF8F4',
    success: '#3E7A5A',
    warning: '#9A6B12',
    reserved: '#8A5A2B',
  },
  dark: {
    text: '#F5EDE6',
    background: '#1A1614',
    backgroundElement: '#2A2420',
    backgroundSelected: '#3A322C',
    textSecondary: '#B0A49A',
    accent: '#E07A68',
    accentText: '#1A1614',
    success: '#7DCE9F',
    warning: '#E6C35C',
    reserved: '#E0B27A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
  sm: 10,
  md: 16,
  lg: 22,
} as const;
