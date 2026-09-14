import type { ItemPledge, WishlistItem } from '@/lib/types';

export function itemPledges(item: WishlistItem): ItemPledge[] {
  return item.pledges ?? [];
}

export function pledgeTotal(item: WishlistItem) {
  return itemPledges(item).reduce((sum, pledge) => sum + pledge.amount, 0);
}

export function isFunded(item: WishlistItem) {
  if (item.funded_at) return true;
  const target = item.target_amount;
  if (target == null || target <= 0) return false;
  return pledgeTotal(item) >= target;
}

export function contributorLabel(displayName: string | null | undefined) {
  const trimmed = displayName?.trim();
  return trimmed ? trimmed : 'Anonymous';
}

export function formatContributorList(names: string[]) {
  const unique = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
  if (unique.length === 0) return 'the group';
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} and ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')}, and ${unique[unique.length - 1]}`;
}

export function pledgeRemaining(item: WishlistItem) {
  const target = item.target_amount;
  if (target == null || target <= 0) return null;
  return Math.max(0, Math.round((target - pledgeTotal(item)) * 100) / 100);
}
