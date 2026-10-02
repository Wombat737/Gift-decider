import { PrettyCopy } from '@/lib/copy';
import { groupGiftPhase } from '@/lib/pledges';
import type { ItemStatus, WishlistItem } from '@/lib/types';

export function statusLabel(status: ItemStatus) {
  switch (status) {
    case 'reserved':
      return 'Reserved';
    case 'purchased':
      return 'Bought';
    default:
      return 'Available';
  }
}

/** Giver-facing reservation — no names, so other givers aren’t spoiled with who. */
export function giverStatusLabel(status: ItemStatus) {
  if (status === 'purchased') return 'Bought';
  if (status === 'reserved') return 'Reserved';
  return 'Available';
}

/**
 * Giver grid chip. Ready to buy is only the group-gift phase (threshold met).
 * Available / Reserved / Bought stay the reservation, including on solo gifts.
 */
export function giverItemChipLabel(item: WishlistItem) {
  const phase = groupGiftPhase(item);
  if (phase === 'ready_to_buy') return 'Ready to buy';
  if (phase === 'purchased') return 'Bought';
  if (phase === 'revealed') return 'Bought · Revealed';
  if (phase === 'collecting') return `${giverStatusLabel(item.status)} · Collecting`;
  return giverStatusLabel(item.status);
}

/** Subtitle under the chip. Same phase as the pill, so Available never reads Ready to buy. */
export function giverStatusHint(item: WishlistItem) {
  const phase = groupGiftPhase(item);
  if (phase === 'ready_to_buy') return PrettyCopy.readyToBuyHint;
  if (item.status === 'purchased' || phase === 'purchased' || phase === 'revealed') {
    return PrettyCopy.purchasedGiver;
  }
  if (item.status === 'reserved') return PrettyCopy.softLock;
  return PrettyCopy.claimHint;
}

export function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export function formatAud(amount: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

export function parseAud(value: string): number | null {
  const trimmed = value.trim().replace(/[^0-9.]/g, '');
  if (!trimmed) return null;
  const amount = Number.parseFloat(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

export function slugToken(prefix: string, title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  return `${prefix}-${slug || 'occasion'}`;
}
