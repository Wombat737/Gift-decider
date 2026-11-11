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
    stone: CoralCoast.stone,
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
    stone: CoralCoastDark.stone,
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

/** Loaded with expo-font. Headlines use Instrument Serif; UI uses Inter. */
export const FontFamilies = {
  sans: 'Inter_400Regular',
  sansMedium: 'Inter_500Medium',
  sansSemibold: 'Inter_600SemiBold',
  sansBold: 'Inter_700Bold',
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: FontFamilies.sans,
    serif: FontFamilies.serif,
    rounded: FontFamilies.sansMedium,
    mono: 'ui-monospace',
    display: FontFamilies.serif,
  },
  android: {
    sans: FontFamilies.sans,
    serif: FontFamilies.serif,
    rounded: FontFamilies.sansMedium,
    mono: 'monospace',
    display: FontFamilies.serif,
  },
  default: {
    sans: FontFamilies.sans,
    serif: FontFamilies.serif,
    rounded: FontFamilies.sansMedium,
    mono: 'monospace',
    display: FontFamilies.serif,
  },
  web: {
    sans: FontFamilies.sans,
    serif: FontFamilies.serif,
    rounded: FontFamilies.sansMedium,
    mono: 'var(--font-mono)',
    display: FontFamilies.serif,
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

/** Paper washes. No saturated colour blocks. */
export const Washes = {
  hero: ['#E4DCCC', '#F3EFE6'] as const,
  chipin: ['#E4DCCC', '#FBF9F4'] as const,
};

/** Selected / press ring — oxblood at 40%. */
export const RingSelected = 'rgba(122, 31, 43, 0.4)';

/** Empty-field hint. Lighter than ink-muted so a placeholder does not read as a filled value. */
export const PlaceholderColor = '#A3A3A3';

/** Sticker chips — taller than pretty v1. */
export const ChipPad = {
  vertical: 10,
  horizontal: 14,
} as const;

/** Empty-state hero art. */
export const IlluSize = 140;

/** Stage home rows — framed thumb cards, short and soft. */
export const StageShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: '#000000',
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
    shadowColor: '#000000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
}) as ViewStyle;

/** Quiet card lift — short contact shadow, soft falloff. */
export const CardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: CoralCoast.ink,
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  android: {
    elevation: 2,
  },
  web: {
    boxShadow: '0 1px 2px rgb(23 23 23 / 0.04), 0 8px 22px rgb(23 23 23 / 0.05)',
  },
  default: {
    shadowColor: CoralCoast.ink,
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
}) as ViewStyle;

/** Primary button at rest — coral tint, lighter than the press lift. */
export const ShadowButton: ViewStyle = Platform.select({
  ios: {
    shadowColor: CoralCoast.brand,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  android: {
    elevation: 2,
  },
  web: {
    boxShadow: '0 1px 2px rgb(26 23 20 / 0.04), 0 6px 16px rgb(122 31 43 / 0.12)',
  },
  default: {
    shadowColor: CoralCoast.brand,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
}) as ViewStyle;

/** Primary CTA press lift — coral-tinted, web + native. */
export const ShadowFloat: ViewStyle = Platform.select({
  ios: {
    shadowColor: CoralCoast.brand,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
  },
  android: {
    elevation: 6,
  },
  web: {
    boxShadow: '0 8px 28px rgb(122 31 43 / 0.18)',
  },
  default: {
    shadowColor: CoralCoast.brand,
    shadowOpacity: 0.18,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 8 },
  },
}) as ViewStyle;
