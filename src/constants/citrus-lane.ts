/** Locked Citrus Lane design tokens. Lemon wash, teal brand, amber only for chip-in. */
export const CitrusLane = {
  bg: '#FFF8E7',
  surface: '#FFFCF5',
  ink: '#14120B',
  inkMuted: '#4F4A3C',
  brand: '#0D9488',
  brandSoft: '#D5F5F0',
  brandText: '#FFFFFF',
  /** Darker teal for small text on lemon — #0D9488 does not meet WCAG AA as body/UI copy. */
  brandInk: '#0F766E',
  accent: '#F59E0B',
  accentMuted: '#FEF3C7',
  accentText: '#14120B',
  /** Darker amber for small text on lemon — #F59E0B is a fill, not a text colour. */
  accentInk: '#92400E',
  paper: '#F3E6C0',
  border: '#E8D9B0',
  reserved: '#9A3412',
  reservedSoft: '#FBE8E0',
  warning: '#B45309',
  overlay: 'rgba(20, 18, 11, 0.42)',
  radius: {
    button: 12,
    card: 16,
    pill: 999,
  },
} as const;

export const CitrusLaneDark = {
  bg: '#0C1716',
  surface: '#152422',
  ink: '#FFF8E7',
  inkMuted: '#C9C0A8',
  brand: '#2DD4BF',
  brandSoft: '#134E4A',
  brandText: '#042F2E',
  brandInk: '#5EEAD4',
  accent: '#F59E0B',
  accentMuted: '#78350F',
  accentText: '#14120B',
  accentInk: '#FCD34D',
  paper: '#1A2E2C',
  border: '#1F3A36',
  reserved: '#FDBA74',
  reservedSoft: '#4A2C22',
  warning: '#FBBF24',
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;
