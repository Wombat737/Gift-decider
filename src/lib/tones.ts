import { groupGiftPhase, isFunded } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';

/** Chip tones used on giver surfaces. `success` is never a chip tone. */
export type GiverChipTone = 'accent' | 'brand' | 'reserved' | 'muted';

/** Success / purchased / reserved treatments must not appear on owner views. */
export const OWNER_FORBIDDEN_TONES = ['success', 'reserved', 'purchased'] as const;

export type OwnerForbiddenTone = (typeof OWNER_FORBIDDEN_TONES)[number];

export function isOwnerForbiddenTone(tone: string): tone is OwnerForbiddenTone {
  return (OWNER_FORBIDDEN_TONES as readonly string[]).includes(tone);
}

/** Owner moment colour (reveal / from-the-group). Brand or ink — never a status chip. */
export function ownerMomentTone(): 'brand' {
  return 'brand';
}

/** Giver list/item chips: coral for chip-in, sage for bought, reserved for Taken. */
export function giverChipTone(item: WishlistItem): GiverChipTone {
  const phase = groupGiftPhase(item);
  if (phase === 'ready_to_buy') return 'accent';
  if (phase === 'purchased' || phase === 'revealed' || item.status === 'purchased') return 'brand';
  if (item.status === 'reserved') return 'reserved';
  if (phase === 'collecting' || isFunded(item)) return 'accent';
  return 'muted';
}
