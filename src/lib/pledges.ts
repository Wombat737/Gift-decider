import type { ItemPledge, WishlistItem } from '@/lib/types';

export function itemPledges(item: WishlistItem): ItemPledge[] {
  return item.pledges ?? [];
}

export function pledgeTotal(item: WishlistItem) {
  return itemPledges(item).reduce((sum, pledge) => sum + pledge.amount, 0);
}

export function isFunded(item: WishlistItem) {
  const target = item.target_amount;
  if (target == null || target <= 0) return false;
  return pledgeTotal(item) >= target;
}

export function pledgeRemaining(item: WishlistItem) {
  const target = item.target_amount;
  if (target == null || target <= 0) return null;
  return Math.max(0, Math.round((target - pledgeTotal(item)) * 100) / 100);
}
