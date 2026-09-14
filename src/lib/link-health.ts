import type { LinkHealth, WishlistItem } from '@/lib/types';

const DEAD_STUB =
  /dead-link|this-link-is-dead|link-is-dead|404-stub|broken-buy-link/i;

export function looksLikeDeadStubUrl(url: string | null | undefined) {
  const trimmed = url?.trim() ?? '';
  if (!trimmed) return false;
  return DEAD_STUB.test(trimmed);
}

/** Heuristic + explicit mark. Demo stub treats obviously-fake dead URLs as broken. */
export function inspectBuyLink(item: Pick<WishlistItem, 'buy_url' | 'buy_url_dead'>): LinkHealth {
  if (item.buy_url_dead) return 'dead';
  const url = item.buy_url?.trim() ?? '';
  if (!url) return 'missing';
  if (looksLikeDeadStubUrl(url)) return 'dead';
  return 'ok';
}

export function linkNeedsHeal(item: Pick<WishlistItem, 'buy_url' | 'buy_url_dead'>) {
  const health = inspectBuyLink(item);
  return health === 'dead' || health === 'missing';
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
