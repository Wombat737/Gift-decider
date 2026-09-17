/** Locked Coral Coast design tokens. Off-white chrome, white cards, coral brand, sunshine chip-in. */
export const CoralCoast = {
  bg: '#FAFAFA',
  surface: '#FFFFFF',
  ink: '#171717',
  inkMuted: '#525252',
  brand: '#E85D4C',
  brandSoft: '#FFE8E4',
  brandText: '#FFFFFF',
  /** Darker coral for small text on white — #E85D4C fails WCAG AA as body/UI copy. */
  brandInk: '#B23A2E',
  accent: '#F5B942',
  /** Pledge-bar track and chip-in chips — never a page background. */
  accentSoft: '#FFF3D1',
  /** Pale sunshine fill alias — same hex as accent-soft. */
  accentMuted: '#FFF3D1',
  /** Ink on sunshine — white on #F5B942 fails contrast. */
  accentText: '#171717',
  /** Darker gold for small text on white — #F5B942 is a fill, not a text colour. */
  accentInk: '#8A5A12',
  /** Giver-only purchased / Bought — never on owner surfaces. */
  success: '#059669',
  successSoft: '#D1FAE5',
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
 * Coral Coast stays on a light off-white canvas even when the OS asks for dark.
 * No cream, lemon wash, or dark base.
 */
export const CoralCoastDark = CoralCoast;
