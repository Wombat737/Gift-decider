import { AU_RETAILERS } from '@/lib/au-buy';
import { inspectBuyLink, linkHealthCopy, linkNeedsHeal } from '@/lib/link-health';
import { suggestSubstitutes } from '@/lib/substitutes';
import type { LinkHealth, WishlistItem } from '@/lib/types';

/**
 * Dead-link heal contract.
 *
 * Demo / soft-launch uses a deterministic stub (known-bad URLs, malformed URLs,
 * optional HEAD via the `heal-link` Edge Function). A cheap LLM can later fill
 * `alternatives` through `HealLinkLlm` without a UI rewrite — same request and
 * result shapes.
 */

export type HealLinkRole = 'owner' | 'giver';

export type HealLinkRequest = {
  id?: string;
  title: string | null;
  notes: string | null;
  tags: string[];
  buy_url: string | null;
  buy_url_dead?: boolean;
  no_substitution: boolean;
  item_kind?: WishlistItem['item_kind'];
};

export type HealAlternative = {
  id: string;
  title: string;
  merchant: string;
  buyUrl: string;
  reason: string;
};

export type HealLinkSource = 'stub' | 'head' | 'llm';

export type HealLinkResult = {
  health: LinkHealth;
  copy: string;
  /** 1–3 close alternatives. Always empty when `no_substitution` is set. */
  alternatives: HealAlternative[];
  source: HealLinkSource;
  allowsSubstitutes: boolean;
};

export type HealLinkLlm = (request: HealLinkRequest) => Promise<HealAlternative[]>;

export type HealLinkProbe = (url: string) => Promise<LinkHealth | 'unknown'>;

/** Giver-only badge / banner copy. Never render this on owner surfaces. */
export const HEAL_BADGE = 'Link may be broken';
export const HEAL_SEE_ALTERNATIVES = 'See alternatives';

const AU_HEAL_MERCHANTS = AU_RETAILERS.filter(
  (row) => row.id === 'amazon-au' || row.id === 'kmart' || row.id === 'target-au',
);

export function asHealLinkRequest(
  item: HealLinkRequest | Pick<
    WishlistItem,
    'id' | 'title' | 'notes' | 'tags' | 'buy_url' | 'buy_url_dead' | 'no_substitution' | 'item_kind'
  >,
): HealLinkRequest {
  return {
    id: 'id' in item ? item.id : undefined,
    title: item.title ?? null,
    notes: item.notes ?? null,
    tags: Array.isArray(item.tags) ? item.tags : [],
    buy_url: item.buy_url ?? null,
    buy_url_dead: Boolean(item.buy_url_dead),
    no_substitution: Boolean(item.no_substitution),
    item_kind: item.item_kind,
  };
}

function asInspectable(request: HealLinkRequest): Pick<WishlistItem, 'buy_url' | 'buy_url_dead'> {
  return {
    buy_url: request.buy_url,
    buy_url_dead: Boolean(request.buy_url_dead),
  };
}

function asCatalogItem(request: HealLinkRequest): WishlistItem {
  return {
    id: request.id ?? 'heal-item',
    wishlist_id: 'heal',
    image_path: null,
    image_url: null,
    title: request.title,
    notes: request.notes,
    source_type: 'url',
    source_url: request.buy_url,
    buy_url: request.buy_url,
    tags: request.tags,
    item_kind: request.item_kind === 'vibe' ? 'vibe' : 'exact',
    size_hint: null,
    target_amount: null,
    occasion_id: null,
    no_substitution: request.no_substitution,
    is_group_gift: false,
    funded_at: null,
    reveal_at: null,
    buy_url_dead: Boolean(request.buy_url_dead),
    organiser_name: null,
    pay_instructions: null,
    delivery_method: null,
    delivery_note: null,
    ready_to_buy_notified_at: null,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    created_at: new Date(0).toISOString(),
  };
}

function alternativesFromRequest(request: HealLinkRequest): HealAlternative[] {
  if (request.no_substitution) return [];
  const swaps = suggestSubstitutes(asCatalogItem(request)).filter((row) => !row.exactSku).slice(0, 3);
  return swaps.map((swap, index) => {
    const merchant = AU_HEAL_MERCHANTS[index % AU_HEAL_MERCHANTS.length] ?? AU_RETAILERS[0];
    return {
      id: swap.id,
      title: swap.title,
      merchant: merchant.label,
      buyUrl: merchant.href(swap.query),
      reason: swap.reason,
    };
  });
}

function mergeAlternatives(base: HealAlternative[], extra: HealAlternative[]) {
  const seen = new Set(base.map((row) => row.title.toLowerCase()));
  const merged = [...base];
  for (const row of extra) {
    const key = row.title.toLowerCase();
    if (!row.title.trim() || !row.merchant.trim() || !row.buyUrl.trim()) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged.slice(0, 3);
}

/**
 * Surprise-safe gate. Dead-link warnings and alternatives are giver-only.
 * Role wins even if the payload still contains a broken `buy_url`.
 */
export function shouldRenderHealUi(role: HealLinkRole, item?: Pick<WishlistItem, 'buy_url' | 'buy_url_dead'> | null) {
  if (role !== 'giver' || !item) return false;
  return linkNeedsHeal(item);
}

export function shouldShowHealAlternatives(
  role: HealLinkRole,
  item?: Pick<WishlistItem, 'buy_url' | 'buy_url_dead' | 'no_substitution'> | null,
) {
  if (!shouldRenderHealUi(role, item) || !item) return false;
  return !item.no_substitution;
}

export function healBadgeLabel(role: HealLinkRole, item?: Pick<WishlistItem, 'buy_url' | 'buy_url_dead'> | null) {
  return shouldRenderHealUi(role, item) ? HEAL_BADGE : null;
}

/**
 * Deterministic heal. No network, no LLM key.
 * `no_substitution` flags a broken link but never returns alternatives.
 */
export function healLink(input: HealLinkRequest | WishlistItem): HealLinkResult {
  const request = asHealLinkRequest(input);
  const health = inspectBuyLink(asInspectable(request));
  const allowsSubstitutes = !request.no_substitution;
  const alternatives = health === 'dead' && allowsSubstitutes ? alternativesFromRequest(request) : [];

  let copy = linkHealthCopy(health);
  if (health === 'dead' && !allowsSubstitutes) {
    copy = `${HEAL_BADGE}. Substitutions are locked — no alternatives.`;
  } else if (health === 'dead') {
    copy = `${HEAL_BADGE}. Close AU-store searches from the title and vibe tags.`;
  }

  return {
    health,
    copy,
    alternatives,
    source: 'stub',
    allowsSubstitutes,
  };
}

/**
 * Same contract as `healLink`, with optional HEAD probe and LLM slots.
 * Callers must not require a live key — omit `llm` / `probe` for the demo stub.
 */
export async function healLinkAsync(
  input: HealLinkRequest | WishlistItem,
  options?: { llm?: HealLinkLlm; probe?: HealLinkProbe },
): Promise<HealLinkResult> {
  const request = asHealLinkRequest(input);
  let result = healLink(request);

  if (options?.probe && request.buy_url?.trim() && result.health === 'ok') {
    try {
      const probed = await options.probe(request.buy_url);
      if (probed === 'dead') {
        result = { ...healLink({ ...request, buy_url_dead: true }), source: 'head' };
      }
    } catch {
      // Probe is best-effort. Keep the stub result.
    }
  }

  if (result.health !== 'dead' || !result.allowsSubstitutes || !options?.llm) {
    return result;
  }

  try {
    const extra = await options.llm(request);
    const alternatives = mergeAlternatives(result.alternatives, extra);
    return {
      ...result,
      alternatives,
      source: extra.length > 0 ? 'llm' : result.source,
    };
  } catch {
    return result;
  }
}
