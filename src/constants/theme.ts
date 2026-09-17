import '@/global.css';

import { Platform, type TextStyle, type ViewStyle } from 'react-native';

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
    accentSoft: CoralCoast.accentSoft,
    accentText: CoralCoast.accentText,
    accentInk: CoralCoast.accentInk,
    success: CoralCoast.success,
    successSoft: CoralCoast.successSoft,
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
    accentSoft: CoralCoastDark.accentSoft,
    accentText: CoralCoastDark.accentText,
    accentInk: CoralCoastDark.accentInk,
    success: CoralCoastDark.success,
    successSoft: CoralCoastDark.successSoft,
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
  if (key === 'brand') return theme.brandInk;
  if (key === 'accent') return theme.accentInk;
  if (key === 'success') return theme.success;
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

/** Pretty-pass type scale — Plus Jakarta Sans, body min 16. */
export const TypeScale = {
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyEm: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  titleSm: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '600' as const },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
} satisfies Record<string, Pick<TextStyle, 'fontSize' | 'lineHeight' | 'fontWeight'>>;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoHalf: 12,
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
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  android: {
    elevation: 2,
  },
  web: {
    boxShadow: '0 1px 2px rgb(0 0 0 / 0.04), 0 4px 12px rgb(0 0 0 / 0.06)',
  },
  default: {
    shadowColor: CoralCoast.ink,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
}) as ViewStyle;
