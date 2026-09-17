import '@/global.css';

import { Platform, type ViewStyle } from 'react-native';

import { CoralCoast, CoralCoastDark } from '@/constants/coral-coast';

export const Colors = {
  light: {
    text: CoralCoast.ink,
    background: CoralCoast.bg,
    backgroundElement: CoralCoast.surface,
    backgroundSelected: CoralCoast.paper,
    textSecondary: CoralCoast.inkMuted,
    brand: CoralCoast.brand,
    brandSoft: CoralCoast.brandSoft,
    brandText: CoralCoast.brandText,
    brandInk: CoralCoast.brandInk,
    accent: CoralCoast.accent,
    accentMuted: CoralCoast.accentMuted,
    accentText: CoralCoast.accentText,
    accentInk: CoralCoast.accentInk,
    success: CoralCoast.brand,
    warning: CoralCoast.warning,
    reserved: CoralCoast.reserved,
    reservedSoft: CoralCoast.reservedSoft,
    border: CoralCoast.border,
    overlay: CoralCoast.overlay,
    paper: CoralCoast.paper,
  },
  dark: {
    text: CoralCoastDark.ink,
    background: CoralCoastDark.bg,
    backgroundElement: CoralCoastDark.surface,
    backgroundSelected: CoralCoastDark.paper,
    textSecondary: CoralCoastDark.inkMuted,
    brand: CoralCoastDark.brand,
    brandSoft: CoralCoastDark.brandSoft,
    brandText: CoralCoastDark.brandText,
    brandInk: CoralCoastDark.brandInk,
    accent: CoralCoastDark.accent,
    accentMuted: CoralCoastDark.accentMuted,
    accentText: CoralCoastDark.accentText,
    accentInk: CoralCoastDark.accentInk,
    success: CoralCoastDark.brand,
    warning: CoralCoastDark.warning,
    reserved: CoralCoastDark.reserved,
    reservedSoft: CoralCoastDark.reservedSoft,
    border: CoralCoastDark.border,
    overlay: CoralCoastDark.overlay,
    paper: CoralCoastDark.paper,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = (typeof Colors)[keyof typeof Colors];

/** Brand/accent fills fail AA as small text on white; map those keys to ink variants. */
export function readableThemeColor(theme: ThemePalette, key: ThemeColor = 'text') {
  if (key === 'brand' || key === 'success') return theme.brandInk;
  if (key === 'accent') return theme.accentInk;
  return theme[key];
}

export const Fonts = Platform.select({
  ios: {
    /** Plus Jakarta Sans on web; system-ui stand-in on native. No serif headings. */
    sans: 'system-ui',
    serif: 'system-ui',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    display: 'system-ui',
  },
  android: {
    sans: 'sans-serif',
    serif: 'sans-serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
    display: 'sans-serif',
  },
  default: {
    sans: 'normal',
    serif: 'normal',
    rounded: 'normal',
    mono: 'monospace',
    display: 'normal',
  },
  web: {
    sans: 'var(--font-sans)',
    serif: 'var(--font-sans)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
    display: 'var(--font-sans)',
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
  sm: CoralCoast.radius.button,
  md: CoralCoast.radius.card,
  lg: CoralCoast.radius.card,
  button: CoralCoast.radius.button,
  card: CoralCoast.radius.card,
  pill: CoralCoast.radius.pill,
} as const;

export const CardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: CoralCoast.ink,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  android: {
    elevation: 2,
  },
  web: {
    boxShadow: '0 10px 28px rgba(23, 23, 23, 0.07)',
  },
  default: {},
}) as ViewStyle;
