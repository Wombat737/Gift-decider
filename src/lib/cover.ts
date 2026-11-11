export type CoverTreatment = 'full' | 'print' | 'monogram';
export type CoverOverride = 'auto' | CoverTreatment;

/** Longest edge under this is a weak print, not a full-bleed cover. */
export const COVER_WEAK_EDGE = 640;

const ORDER: CoverOverride[] = ['auto', 'full', 'print', 'monogram'];

export function resolveCoverTreatment(input: {
  imageUrl?: string | null;
  width?: number | null;
  height?: number | null;
  override?: CoverOverride | null;
}): CoverTreatment {
  if (input.override && input.override !== 'auto') return input.override;
  const url = (input.imageUrl ?? '').trim();
  if (!url) return 'monogram';
  const width = input.width ?? 0;
  const height = input.height ?? 0;
  if (width > 0 && height > 0 && Math.max(width, height) < COVER_WEAK_EDGE) return 'print';
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

/** Large serif numeral or initial when a cover has no photo. */
export function coverMark(title?: string | null) {
  const trimmed = (title ?? '').trim();
  const digit = trimmed.match(/\d/);
  if (digit && /^[^A-Za-z]*\d/.test(trimmed)) return digit[0];
  const letter = trimmed.match(/[A-Za-z0-9]/);
  return (letter?.[0] ?? 'M').toUpperCase();
}
