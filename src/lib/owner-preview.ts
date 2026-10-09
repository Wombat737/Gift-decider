import type { WishlistItem } from '@/lib/types';

/**
 * Owner "Preview giver view" payload.
 * Items look available. No reservation, purchase, funding, pledge, or giver name.
 * Stricter than ownerSafeItem, which may show contributor names after the reveal date.
 */
export function ownerPreviewItem(item: WishlistItem): WishlistItem {
  return {
    ...item,
    tags: [...item.tags],
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    is_group_gift: false,
    buy_url_dead: false,
    funded_at: null,
    reveal_at: null,
    organiser_name: null,
    pay_instructions: null,
    delivery_method: null,
    delivery_note: null,
    ready_to_buy_notified_at: null,
    pledges: undefined,
    notices: undefined,
    reveal: undefined,
  };
}

/** True when a preview payload still carries giver coordination state. */
export function ownerPreviewLeaks(item: WishlistItem): string | null {
  if (item.status !== 'available') return 'status';
  if (item.reserved_by) return 'reserved_by';
  if (item.reserved_at) return 'reserved_at';
  if (item.is_group_gift) return 'is_group_gift';
  if (item.buy_url_dead) return 'buy_url_dead';
  if (item.funded_at) return 'funded_at';
  if (item.reveal_at) return 'reveal_at';
  if (item.organiser_name) return 'organiser_name';
  if (item.pay_instructions) return 'pay_instructions';
  if (item.delivery_method) return 'delivery_method';
  if (item.delivery_note) return 'delivery_note';
  if (item.ready_to_buy_notified_at) return 'ready_to_buy_notified_at';
  if (item.pledges?.length) return 'pledges';
  if (item.notices?.length) return 'notices';
  if (item.reveal) return 'reveal';
  const json = JSON.stringify(item);
  if (/"display_name"/.test(json)) return 'display_name';
  if (/"author_display_name"/.test(json)) return 'author_display_name';
  if (/"reserved_by"\s*:\s*"[^"]/.test(json)) return 'reserved_name';
  return null;
}

export function isOwnerPreviewParam(value: unknown): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === '1' || raw === 'true';
}

export function viewerOwnsShareToken(
  token: string | undefined,
  ownTokens: Array<string | null | undefined>,
): boolean {
  if (!token) return false;
  return ownTokens.some((candidate) => Boolean(candidate) && candidate === token);
}

/**
 * Preview flag always sanitizes, including Explore demo.
 * A live owner opening their own share link is sanitized even without the flag.
 * Demo giver walkthrough of /g/demo stays intact unless the preview flag is set.
 */
export function shouldSanitizeOwnerPreview(input: {
  previewParam: boolean;
  token?: string;
  ownTokens: Array<string | null | undefined>;
  demo: boolean;
}): boolean {
  if (input.previewParam) return true;
  if (input.demo) return false;
  return viewerOwnsShareToken(input.token, input.ownTokens);
}
