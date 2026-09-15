import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

import { CitrusLane, CitrusLaneDark } from '@/constants/citrus-lane';

export const Colors = {
  light: {
    text: CitrusLane.ink,
    background: CitrusLane.bg,
    backgroundElement: CitrusLane.surface,
    backgroundSelected: CitrusLane.paper,
    textSecondary: CitrusLane.inkMuted,
    brand: CitrusLane.brand,
    brandSoft: CitrusLane.brandSoft,
    brandText: CitrusLane.brandText,
    brandInk: CitrusLane.brandInk,
    accent: CitrusLane.accent,
    accentMuted: CitrusLane.accentMuted,
    accentText: CitrusLane.accentText,
    accentInk: CitrusLane.accentInk,
    success: CitrusLane.brand,
    warning: CitrusLane.warning,
    reserved: CitrusLane.reserved,
    reservedSoft: CitrusLane.reservedSoft,
    border: CitrusLane.border,
    overlay: CitrusLane.overlay,
    paper: CitrusLane.paper,
  },
  dark: {
    text: CitrusLaneDark.ink,
    background: CitrusLaneDark.bg,
    backgroundElement: CitrusLaneDark.surface,
    backgroundSelected: CitrusLaneDark.paper,
    textSecondary: CitrusLaneDark.inkMuted,
    brand: CitrusLaneDark.brand,
    brandSoft: CitrusLaneDark.brandSoft,
    brandText: CitrusLaneDark.brandText,
    brandInk: CitrusLaneDark.brandInk,
    accent: CitrusLaneDark.accent,
    accentMuted: CitrusLaneDark.accentMuted,
    accentText: CitrusLaneDark.accentText,
    accentInk: CitrusLaneDark.accentInk,
    success: CitrusLaneDark.brand,
    warning: CitrusLaneDark.warning,
    reserved: CitrusLaneDark.reserved,
    reservedSoft: CitrusLaneDark.reservedSoft,
    border: CitrusLaneDark.border,
    overlay: CitrusLaneDark.overlay,
    paper: CitrusLaneDark.paper,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = (typeof Colors)[keyof typeof Colors];

/** Brand/accent fills fail AA as small text on lemon; map those keys to ink variants. */
export function readableThemeColor(theme: ThemePalette, key: ThemeColor = 'text') {
  if (key === 'brand' || key === 'success') return theme.brandInk;
  if (key === 'accent') return theme.accentInk;
  return theme[key];
}

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
  sm: CitrusLane.radius.button,
  md: CitrusLane.radius.card,
  lg: CitrusLane.radius.card,
  button: CitrusLane.radius.button,
  card: CitrusLane.radius.card,
  pill: CitrusLane.radius.pill,
} as const;

export const CardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: CitrusLane.ink,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  android: {
    elevation: 2,
  },
  web: {
    boxShadow: '0 10px 28px rgba(20, 18, 11, 0.08)',
  },
  default: {},
}) as ViewStyle;
