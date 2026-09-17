import { groupGiftPhase, isFunded } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';

/** Chip tones used on giver surfaces. `success` is giver-only (Bought). */
export type GiverChipTone = 'accent' | 'brand' | 'reserved' | 'muted' | 'success';

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

/** Giver list/item chips: sunshine chip-in, coral ready-to-buy, success Bought, reserved Taken. */
export function giverChipTone(item: WishlistItem): GiverChipTone {
  const phase = groupGiftPhase(item);
  if (phase === 'purchased' || phase === 'revealed' || item.status === 'purchased') {
    return 'success';
  }
  if (phase === 'ready_to_buy') return 'brand';
  if (item.status === 'reserved') return 'reserved';
  if (phase === 'collecting' || isFunded(item)) return 'accent';
  return 'muted';
}
