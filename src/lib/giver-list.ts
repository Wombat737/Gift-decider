import { formatAudQuiet } from '@/lib/format';
import { groupGiftPhase, pledgeFillRatio, pledgeTotal } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';

/** Session sort on the giver list. Recommended keeps the loaded order. */
export type GiverListSort = 'recommended' | 'price-asc' | 'price-desc';

export type GiverListView = {
  sort: GiverListSort;
  availableOnly: boolean;
};

export const GIVER_LIST_SORTS: { id: GiverListSort; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'price-asc', label: 'Price low→high' },
  { id: 'price-desc', label: 'Price high→low' },
];

/** Sort and filter stay off short lists — five picks don’t need the row. */
export const GIVER_LIST_CONTROLS_MIN = 6;

export function giverListControlsVisible(itemCount: number) {
  return itemCount >= GIVER_LIST_CONTROLS_MIN;
}

/** Positive amount only. Null, zero, and junk stay blank — never “price unknown”. */
export function giverPriceAmount(item: Pick<WishlistItem, 'target_amount'>): number | null {
  const amount = item.target_amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

/**
 * Quiet price line. Group gifts read as a chip-in goal.
 * `is_group_gift` is stripped on the owner preview, so “goal” never leaks there.
 */
export function giverPriceLabel(item: Pick<WishlistItem, 'target_amount' | 'is_group_gift'>): string | null {
  const amount = giverPriceAmount(item);
  if (amount == null) return null;
  const formatted = formatAudQuiet(amount);
  return item.is_group_gift ? `${formatted} goal` : formatted;
}

/**
 * Slim group-gift meter. Null unless this row is still a group gift, so the
 * owner preview (group flag and pledges stripped) never shows a contribution total.
 * Givers already have pledge rows from list_shared_item_pledges.
 */
export function groupGiftCardProgress(item: WishlistItem): { ratio: number; label: string } | null {
  if (!item.is_group_gift) return null;
  const phase = groupGiftPhase(item);
  const total = pledgeTotal(item);
  const target = giverPriceAmount(item);
  const ready = phase === 'ready_to_buy';
  if (target == null) {
    const amount = `${formatAudQuiet(total)} chipped in`;
    return {
      ratio: pledgeFillRatio(item),
      label: ready ? `${amount} · Ready to buy` : amount,
    };
  }
  const amounts = `${formatAudQuiet(total)} of ${formatAudQuiet(target)}`;
  return {
    ratio: ready ? 1 : pledgeFillRatio(item),
    label: ready ? `${amounts} · Ready to buy` : amounts,
  };
}

/** Reservation badge. Null while the gift is still open. Owners must not render this. */
export function giverClaimBadge(item: Pick<WishlistItem, 'status'>): 'Reserved' | 'Bought' | null {
  if (item.status === 'reserved') return 'Reserved';
  if (item.status === 'purchased') return 'Bought';
  return null;
}

/**
 * Hidden by “Available only”: reserved, bought, and group gifts that are
 * funded (ready to buy) or already purchased.
 */
export function giverItemUnavailable(item: WishlistItem): boolean {
  if (item.status === 'reserved' || item.status === 'purchased') return true;
  const phase = groupGiftPhase(item);
  return phase === 'ready_to_buy' || phase === 'purchased' || phase === 'revealed';
}

function priceRank(item: Pick<WishlistItem, 'target_amount'>, direction: 'asc' | 'desc') {
  const amount = giverPriceAmount(item);
  if (amount == null) return Number.POSITIVE_INFINITY;
  return direction === 'asc' ? amount : -amount;
}

/** Stable price sort. Unpriced items stay last, in their incoming order. */
export function sortGiverItems<T extends Pick<WishlistItem, 'target_amount'>>(
  items: readonly T[],
  sort: GiverListSort,
): T[] {
  if (sort === 'recommended') return [...items];
  const direction = sort === 'price-asc' ? 'asc' : 'desc';
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const delta = priceRank(a.item, direction) - priceRank(b.item, direction);
      if (delta !== 0) return delta;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}

export function applyGiverListView<T extends WishlistItem>(items: readonly T[], view: GiverListView): T[] {
  const filtered = view.availableOnly ? items.filter((item) => !giverItemUnavailable(item)) : items;
  return sortGiverItems(filtered, view.sort);
}

/**
 * Search hits in, then sort/filter. Controls are ignored when the full list
 * is too short to show them, so a hidden toggle cannot strand the list.
 */
export function presentGiverList<T extends WishlistItem>(
  searched: readonly T[],
  view: GiverListView,
  sourceCount: number,
): T[] {
  if (!giverListControlsVisible(sourceCount)) return [...searched];
  return applyGiverListView(searched, view);
}
