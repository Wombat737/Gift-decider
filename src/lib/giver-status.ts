import { giverItemChipLabel } from '@/lib/format';
import { giverChipTone, type GiverChipTone } from '@/lib/tones';
import type { ItemStatus, WishlistItem } from '@/lib/types';

/** RPC / JSON rows may omit `status` when table column grants hide giver fields. */
export function coerceItemStatus(value: unknown, fallback: ItemStatus = 'available'): ItemStatus {
  if (value === 'reserved' || value === 'purchased' || value === 'available') return value;
  return fallback;
}

/** Apply a soft-lock / purchase / release locally so giver chips can update even if the row is sparse. */
export function applyItemStatus(
  item: WishlistItem,
  status: ItemStatus,
  reservedBy?: string | null,
): WishlistItem {
  return {
    ...item,
    status,
    reserved_by: status === 'available' ? null : reservedBy?.trim() || item.reserved_by || 'A generous friend',
    reserved_at: status === 'available' ? null : item.reserved_at ?? new Date().toISOString(),
  };
}

export function replaceSharedItem(items: WishlistItem[], next: WishlistItem) {
  if (items.some((item) => item.id === next.id)) {
    return items.map((item) => (item.id === next.id ? next : item));
  }
  return [next, ...items];
}

/** Giver list badge + item indicator. Owners must not render this. */
export function giverStatusChip(item: WishlistItem): { label: string; tone: GiverChipTone } {
  return {
    label: giverItemChipLabel(item),
    tone: giverChipTone(item),
  };
}
