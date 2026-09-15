import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

import { Sunroom, SunroomDark } from '@/constants/sunroom';

export const Colors = {
  light: {
    text: Sunroom.ink,
    background: Sunroom.bg,
    backgroundElement: Sunroom.surface,
    backgroundSelected: Sunroom.paper,
    textSecondary: Sunroom.inkMuted,
    brand: Sunroom.brand,
    brandSoft: Sunroom.brandSoft,
    brandText: Sunroom.brandText,
    accent: Sunroom.accent,
    accentMuted: Sunroom.accentMuted,
    accentText: Sunroom.accentText,
    success: Sunroom.brand,
    warning: Sunroom.warning,
    reserved: Sunroom.reserved,
    border: Sunroom.border,
    overlay: Sunroom.overlay,
    paper: Sunroom.paper,
  },
  dark: {
    text: SunroomDark.ink,
    background: SunroomDark.bg,
    backgroundElement: SunroomDark.surface,
    backgroundSelected: SunroomDark.paper,
    textSecondary: SunroomDark.inkMuted,
    brand: SunroomDark.brand,
    brandSoft: SunroomDark.brandSoft,
    brandText: SunroomDark.brandText,
    accent: SunroomDark.accent,
    accentMuted: SunroomDark.accentMuted,
    accentText: SunroomDark.accentText,
    success: SunroomDark.brand,
    warning: SunroomDark.warning,
    reserved: SunroomDark.reserved,
    border: SunroomDark.border,
    overlay: SunroomDark.overlay,
    paper: SunroomDark.paper,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** Closest Expo stand-in for Plus Jakarta Sans / Fraunces until google fonts are bundled. */
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
  sm: Sunroom.radius.button,
  md: Sunroom.radius.card,
  lg: Sunroom.radius.card,
  button: Sunroom.radius.button,
  card: Sunroom.radius.card,
  pill: Sunroom.radius.pill,
} as const;

export const CardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: Sunroom.ink,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  android: {
    elevation: 2,
  },
  web: {
    boxShadow: '0 10px 28px rgba(31, 42, 36, 0.07)',
  },
  default: {},
}) as ViewStyle;
