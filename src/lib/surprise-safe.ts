import { contributorLabel, isFunded } from '@/lib/pledges';
import type { FundedReveal, WishlistItem } from '@/lib/types';

function revealFromItem(item: WishlistItem): FundedReveal {
  const contributors = (item.pledges ?? []).map((pledge) => contributorLabel(pledge.display_name));
  return {
    from_group: true,
    contributors,
  };
}

/**
 * Recipient/owner payload. Strips in-flight spoilers (reserve, purchase, pledges,
 * group progress, dead-link heal). After a group gift is funded, attaches who
 * chipped in — names only, never amounts.
 */
export function ownerSafeItem(item: WishlistItem): WishlistItem {
  const funded = isFunded(item);

  return {
    ...item,
    tags: [...item.tags],
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    is_group_gift: false,
    buy_url_dead: false,
    funded_at: funded ? (item.funded_at ?? item.created_at) : null,
    pledges: undefined,
    reveal: funded ? revealFromItem(item) : undefined,
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
  if (!isFunded(item) && item.reveal) return 'early_reveal';
  if (!isFunded(item) && item.funded_at) return 'early_funded_at';
  if (item.reveal?.contributors.some((name) => /\d/.test(name) && /\$|aud/i.test(name))) return 'amount_in_name';
  return null;
}
