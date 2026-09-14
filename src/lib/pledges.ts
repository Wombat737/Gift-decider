import type { ItemPledge, WishlistItem } from '@/lib/types';

/** Local calendar date as YYYY-MM-DD (MVP compare; not timezone-aware). */
export function localDateISO(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftLocalDate(days: number, from = new Date()) {
  return localDateISO(new Date(from.getFullYear(), from.getMonth(), from.getDate() + days));
}

export function asRevealDate(value: string | null | undefined) {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function formatRevealDate(value: string | null | undefined) {
  const iso = asRevealDate(value);
  if (!iso) return 'the reveal date';
  const [year, month, day] = iso.split('-').map((part) => Number(part));
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function isRevealDue(item: Pick<WishlistItem, 'reveal_at'>, now = new Date()) {
  const iso = asRevealDate(item.reveal_at);
  if (!iso) return false;
  return localDateISO(now) >= iso;
}

/** Owner sees who chipped in only for a group gift on/after reveal_at — funded does not unlock it. */
export function isRevealedToOwner(item: WishlistItem, now = new Date()) {
  return Boolean(item.is_group_gift) && isRevealDue(item, now);
}

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
