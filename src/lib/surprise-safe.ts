import { contributorLabel, isRevealedToOwner } from '@/lib/pledges';
import type { FundedReveal, WishlistItem } from '@/lib/types';

function revealFromItem(item: WishlistItem): FundedReveal {
  const contributors = (item.pledges ?? []).map((pledge) => contributorLabel(pledge.display_name));
  return {
    from_group: true,
    contributors,
    reveal_at: item.reveal_at,
  };
}

/**
 * Recipient/owner payload. Strips in-flight spoilers (reserve, purchase, pledges,
 * group progress, dead-link heal, funded state). On/after the reveal date for a
 * group gift, attaches who chipped in — names only, never amounts.
 */
export function ownerSafeItem(item: WishlistItem): WishlistItem {
  const revealed = isRevealedToOwner(item);

  return {
    ...item,
    tags: [...item.tags],
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    is_group_gift: false,
    buy_url_dead: false,
    funded_at: null,
    reveal_at: revealed ? item.reveal_at : null,
    organiser_name: null,
    pay_instructions: null,
    delivery_method: null,
    delivery_note: null,
    ready_to_buy_notified_at: null,
    pledges: undefined,
    notices: undefined,
    reveal: revealed ? revealFromItem(item) : undefined,
    // Giver comments never ride on an owner payload.
  };
}

/** Owner/recipient payloads must not include reservation, group-gift, or pledge fields. */
export function hideReservationFromOwner(item: WishlistItem): WishlistItem {
  return ownerSafeItem(item);
}

export function ownerPayloadLeaksGiftProgress(item: WishlistItem) {
  if (item.status !== 'available') return 'status';
  if (item.reserved_by) return 'reserved_by';
  if (item.reserved_at) return 'reserved_at';
  if (item.is_group_gift) return 'is_group_gift';
  if (item.buy_url_dead) return 'buy_url_dead';
  if (item.pledges) return 'pledges';
  if (item.notices) return 'notices';
  if (item.organiser_name) return 'organiser_name';
  if (item.pay_instructions) return 'pay_instructions';
  if (item.delivery_method) return 'delivery_method';
  if (item.delivery_note) return 'delivery_note';
  if (item.ready_to_buy_notified_at) return 'ready_to_buy_notified_at';
  if (item.funded_at) return 'funded_at';
  if (!item.reveal && item.reveal_at) return 'early_reveal_at';
  if (item.reveal?.contributors.some((name) => /\d/.test(name) && /\$|aud/i.test(name))) return 'amount_in_name';
  const json = JSON.stringify(item);
  if (/"author_display_name"/.test(json) && /comment/i.test(json)) return 'giver_comments';
  return null;
}
