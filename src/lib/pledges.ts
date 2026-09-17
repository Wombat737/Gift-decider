import type { GroupGiftPhase, ItemPledge, WishlistItem } from '@/lib/types';

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

/** Display-only AU calendar date (`dd/mm/yyyy`). Storage stays YYYY-MM-DD. */
export function formatRevealDate(value: string | null | undefined) {
  const iso = asRevealDate(value);
  if (!iso) return 'the reveal date';
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
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

export function pledgeRemaining(item: WishlistItem) {
  const target = item.target_amount;
  if (target == null || target <= 0) return null;
  return Math.max(0, Math.round((target - pledgeTotal(item)) * 100) / 100);
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

export function groupGiftPhase(item: WishlistItem): GroupGiftPhase | null {
  if (!item.is_group_gift) return null;
  if (isRevealDue(item) && item.status === 'purchased') return 'revealed';
  if (item.status === 'purchased') return 'purchased';
  if (isFunded(item)) return 'ready_to_buy';
  return 'collecting';
}

export function groupGiftPhaseLabel(phase: GroupGiftPhase | null) {
  switch (phase) {
    case 'collecting':
      return 'Collecting';
    case 'ready_to_buy':
      return 'Ready to buy';
    case 'purchased':
      return 'Purchased';
    case 'revealed':
      return 'Revealed';
    default:
      return null;
  }
}

export function deliveryMethodLabel(method: WishlistItem['delivery_method']) {
  switch (method) {
    case 'to_organiser':
      return 'Ship to organiser';
    case 'collect':
      return 'Collect / pickup';
    case 'other':
      return 'Other';
    default:
      return null;
  }
}

export function asDeliveryMethod(value: string | null | undefined): WishlistItem['delivery_method'] {
  if (value === 'to_organiser' || value === 'collect' || value === 'other') return value;
  return null;
}

export function pickOrganiserName(item: WishlistItem, fallback?: string | null) {
  const named = fallback?.trim();
  if (named) return named;
  if (item.organiser_name?.trim()) return item.organiser_name.trim();
  const firstNamed = itemPledges(item).find((row) => row.display_name?.trim())?.display_name?.trim();
  return firstNamed || 'the organiser';
}

export function readyToBuyEmailPreview(item: WishlistItem) {
  const who = item.organiser_name?.trim() || 'Organiser';
  const title = item.title || 'the group gift';
  const pay = item.pay_instructions?.trim() || '(no PayID / BSB note yet)';
  const reveal = formatRevealDate(item.reveal_at);
  const subject = `Funded — time to buy ${title}`;
  const text = [
    `Hi ${who},`,
    '',
    `The group gift “${title}” is funded. Gift Decider holds no money — honour system.`,
    `How givers pay you: ${pay}`,
    `They see who chipped in on ${reveal} — not today.`,
    '',
    'Mark it purchased in the giver view when you’ve bought it, and pick delivery (to you / collect / other).',
  ].join('\n');
  return { subject, text };
}
