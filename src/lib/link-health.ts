import type { LinkHealth, WishlistItem } from '@/lib/types';

const DEAD_STUB =
  /dead-link|this-link-is-dead|link-is-dead|404-stub|broken-buy-link/i;

export function looksLikeDeadStubUrl(url: string | null | undefined) {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return false;
  return DEAD_STUB.test(trimmed);
}

export function isMalformedBuyUrl(url: string | null | undefined) {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol !== 'http:' && parsed.protocol !== 'https:';
  } catch {
    return true;
  }
}

/** Heuristic + explicit mark. Demo stub treats obviously-fake / malformed URLs as broken. */
export function inspectBuyLink(item: Pick<WishlistItem, 'buy_url' | 'buy_url_dead'>): LinkHealth {
  if (item.buy_url_dead) return 'dead';
  const url = item.buy_url?.trim() ?? '';
  if (!url) return 'missing';
  if (isMalformedBuyUrl(url) || looksLikeDeadStubUrl(url)) return 'dead';
  return 'ok';
}

/** Dead or malformed buy URLs — not merely missing. Giver heal badge uses this. */
export function linkNeedsHeal(item: Pick<WishlistItem, 'buy_url' | 'buy_url_dead'>) {
  return inspectBuyLink(item) === 'dead';
}

export function linkHealthCopy(health: LinkHealth) {
  switch (health) {
    case 'dead':
      return 'This buy link looks dead.';
    case 'missing':
      return 'No buy link on this item.';
    default:
      return 'Buy link looks fine.';
  }
}
