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

/**
 * A silent list refresh can return the pre-purchase `reserved` row (same reserved_at —
 * purchase does not bump it). Keep Bought in that case. An explicit release (available
 * + cleared reserved_at) still wins.
 */
export function mergeGiverItem(remote: WishlistItem, previous?: WishlistItem | null): WishlistItem {
  if (!previous || previous.id !== remote.id) {
    return { ...remote, status: coerceItemStatus(remote.status) };
  }

  const remoteKnown =
    remote.status === 'reserved' || remote.status === 'purchased' || remote.status === 'available';
  if (!remoteKnown) {
    return {
      ...remote,
      status: previous.status,
      reserved_by: previous.reserved_by,
      reserved_at: previous.reserved_at,
    };
  }

  if (remote.status === 'available' && !remote.reserved_at && !remote.reserved_by) {
    return { ...remote, status: 'available', reserved_by: null, reserved_at: null };
  }

  // Status omitted from a live RPC row looks like `available` after coerce, but lock
  // fields remain. Keep Taken/Bought from the in-memory catalog.
  if (
    remote.status === 'available' &&
    previous.status !== 'available' &&
    (remote.reserved_at || remote.reserved_by)
  ) {
    return {
      ...remote,
      status: previous.status,
      reserved_by: previous.reserved_by ?? remote.reserved_by,
      reserved_at: previous.reserved_at ?? remote.reserved_at,
    };
  }

  if (
    previous.status === 'purchased' &&
    remote.status === 'reserved' &&
    (remote.reserved_at ?? null) === (previous.reserved_at ?? null)
  ) {
    return {
      ...remote,
      status: 'purchased',
      reserved_by: previous.reserved_by,
      reserved_at: previous.reserved_at,
    };
  }

  return { ...remote, status: coerceItemStatus(remote.status, previous.status) };
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
