/** Locked Coral Coast design tokens. Pure white base, coral brand, sunshine chip-in. */
export const CoralCoast = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  ink: '#171717',
  inkMuted: '#525252',
  brand: '#E85D4C',
  brandSoft: '#FDE8E5',
  brandText: '#FFFFFF',
  /** Darker coral for small text on white — #E85D4C fails WCAG AA as body/UI copy. */
  brandInk: '#B23A2E',
  accent: '#F5B942',
  /** Pale sunshine fill — not lemon wash #FFF8E7, never a page background. */
  accentMuted: '#FDF3DC',
  /** Ink on sunshine — white on #F5B942 fails contrast. */
  accentText: '#171717',
  /** Darker gold for small text on white — #F5B942 is a fill, not a text colour. */
  accentInk: '#8A5A12',
  paper: '#FAFAFA',
  border: '#E5E5E5',
  reserved: '#9A3412',
  reservedSoft: '#FBE4DC',
  warning: '#B45309',
  overlay: 'rgba(23, 23, 23, 0.42)',
  radius: {
    button: 12,
    card: 16,
    pill: 999,
  },
} as const;

/**
 * Coral Coast stays on a pure light white canvas even when the OS asks for dark.
 * No cream, lemon wash, or dark base.
 */
export const CoralCoastDark = CoralCoast;
