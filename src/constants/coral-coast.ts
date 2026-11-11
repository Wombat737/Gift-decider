/**
 * Sunday Edition, refined. The old Coral Coast export name stays so screens
 * keep reading one palette: paper, card, rule, stone, muted, ink, oxblood.
 * No saturated colour blocks. Oxblood is the primary action colour.
 */
export const SundayEdition = {
  paper: '#F3EFE6',
  card: '#FBF9F4',
  rule: '#D9D2C4',
  stone: '#E4DCCC',
  muted: '#6B645B',
  ink: '#1A1714',
  oxblood: '#7A1F2B',
  onOxblood: '#FBF9F4',
  overlay: 'rgba(26, 23, 20, 0.42)',
  radius: {
    button: 12,
    card: 16,
    pill: 999,
  },
} as const;

export const CoralCoast = {
  bg: SundayEdition.paper,
  surface: SundayEdition.card,
  ink: SundayEdition.ink,
  inkMuted: SundayEdition.muted,
  brand: SundayEdition.oxblood,
  brandSoft: SundayEdition.stone,
  brandText: SundayEdition.onOxblood,
  brandInk: SundayEdition.oxblood,
  /** Thin emphasis (progress). Not a page-sized block. */
  accent: SundayEdition.oxblood,
  accentSoft: SundayEdition.stone,
  accentMuted: SundayEdition.stone,
  accentText: SundayEdition.ink,
  accentInk: SundayEdition.oxblood,
  success: SundayEdition.ink,
  successSoft: SundayEdition.stone,
  paper: SundayEdition.paper,
  border: SundayEdition.rule,
  reserved: SundayEdition.oxblood,
  reservedSoft: SundayEdition.stone,
  warning: SundayEdition.oxblood,
  overlay: SundayEdition.overlay,
  stone: SundayEdition.stone,
  radius: SundayEdition.radius,
} as const;

/** Light paper even when the OS asks for dark. */
export const CoralCoastDark = CoralCoast;
