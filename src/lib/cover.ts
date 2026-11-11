export type CoverTreatment = 'full' | 'print' | 'monogram';
export type CoverOverride = 'auto' | CoverTreatment;

/** Short edge under this is a weak print. Good photos are at least 1080px on the short edge. */
export const COVER_SHORT_EDGE = 1080;
export const COVER_DARK_LUMINANCE = 0.3;
export const COVER_FLAT_SPREAD = 0.15;

const ORDER: CoverOverride[] = ['auto', 'full', 'print', 'monogram'];

export function dimensionsFromUrl(url?: string | null) {
  const match = (url ?? '').match(/\/(\d{2,5})\/(\d{2,5})(?:[/?#]|$)/);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!width || !height) return null;
  return { width, height };
}

/**
 * Only ever downgrades a photo. The owner override wins.
 * Weak: short edge under 1080, too dark, too flat, or flagged busy.
 */
export function resolveCoverTreatment(input: {
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
  luminance?: number | null;
  spread?: number | null;
  flagged?: boolean | null;
  override?: CoverOverride | null;
}): CoverTreatment {
  if (input.override && input.override !== 'auto') return input.override;
  const url = (input.imageUrl ?? '').trim();
  if (!url) return 'monogram';
  if (input.flagged) return 'print';
  const hinted = dimensionsFromUrl(url);
  const width = input.width || hinted?.width || 0;
  const height = input.height || hinted?.height || 0;
  if (width > 0 && height > 0 && Math.min(width, height) < COVER_SHORT_EDGE) return 'print';
  if (input.luminance != null && input.luminance < COVER_DARK_LUMINANCE) return 'print';
  if (input.spread != null && input.spread < COVER_FLAT_SPREAD) return 'print';
  return 'full';
}

export function nextCoverOverride(current: CoverOverride | null | undefined): CoverOverride {
  const index = ORDER.indexOf(current && ORDER.includes(current) ? current : 'auto');
  return ORDER[(index + 1) % ORDER.length];
}

export function coverOverrideLabel(override: CoverOverride) {
  switch (override) {
    case 'full':
      return 'Full photo';
    case 'print':
      return 'Small print';
    case 'monogram':
      return 'Letter';
    default:
      return 'Auto';
  }
}

/**
 * No-photo mark. Birthdays use the age, dated events use the day, anything else an initial.
 */
export function coverMark(title?: string | null, eventOn?: string | null) {
  const trimmed = (title ?? '').trim();
  const age = trimmed.match(/\b(\d{1,3})(?:st|nd|rd|th)\b/i);
  if (age && /birth|bday|year/i.test(trimmed)) return age[1];
  if (age && /th|st|nd|rd/i.test(trimmed) && Number(age[1]) <= 120) return age[1];
  if (eventOn && /^\d{4}-\d{2}-\d{2}$/.test(eventOn)) {
    const day = String(Number(eventOn.slice(8, 10)));
    if (day !== '0') return day;
  }
  const letter = trimmed.match(/[A-Za-z]/);
  return (letter?.[0] ?? 'M').toUpperCase();
}
