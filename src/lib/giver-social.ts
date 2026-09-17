import type {
  Discoverability,
  GiftSearchHit,
  HandleSearchHit,
  ItemGiverComment,
  MemberAccessStatus,
} from '@/lib/types';

export const HANDLE_SEARCH_LIMIT = 10;
export const HANDLE_SEARCH_WINDOW_MS = 10 * 60 * 1000;
export const ACCESS_REQUEST_LIMIT = 5;
export const ACCESS_REQUEST_WINDOW_MS = 24 * 60 * 60 * 1000;
export const EMAIL_INVITE_LIMIT = 10;
export const EMAIL_INVITE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const PENDING_REQUEST_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_TASTE_TAGS = 30;
export const MAX_ITEM_TAGS = 10;
export const MAX_TAG_CHARS = 32;
export const MAX_COMMENT_CHARS = 2000;

export type GiverSocialRateKind = 'handle_search' | 'access_request' | 'email_invite';

export function normalizeHandleQuery(raw: string) {
  return raw.trim().replace(/^@+/, '').toLowerCase();
}

export function matchesHandleSearch(opts: {
  handle: string | null;
  displayName?: string | null;
  query: string;
  discoverability: Discoverability;
}) {
  const q = normalizeHandleQuery(opts.query);
  if (q.length < 2) return false;
  if (opts.discoverability !== 'handle') return false;
  if (!opts.handle) return false;
  const handle = opts.handle.toLowerCase();
  // Prefix / exact on handle only — never display name.
  return handle === q || handle.startsWith(q);
}

export function canGiverOpenWishlist(opts: {
  memberStatus?: MemberAccessStatus | 'none' | null;
  accepted?: boolean;
  hasShareToken: boolean;
  isPublicLink: boolean;
}) {
  if (opts.hasShareToken) return true;
  if (opts.isPublicLink) return true;
  return opts.memberStatus === 'active' && opts.accepted !== false;
}

export function pendingRequestExpired(createdAt: string, now = Date.now()) {
  const then = Date.parse(createdAt);
  if (!Number.isFinite(then)) return false;
  return now - then > PENDING_REQUEST_TTL_MS;
}

export function ownerMayReadGiverComments() {
  return false;
}

export function giverCanUseComments(opts: {
  loggedIn: boolean;
  isOwner: boolean;
  memberStatus?: MemberAccessStatus | 'none' | null;
  /** Explore-demo /g/[token] is the giver persona even when the demo user owns the list. */
  demoGiverPersona?: boolean;
}) {
  if (!opts.loggedIn) return false;
  if (opts.demoGiverPersona) return true;
  if (opts.isOwner) return false;
  return opts.memberStatus === 'active';
}

export function commentVisibleOnOwnerItem() {
  return false;
}

export function normalizeTasteTag(raw: string) {
  const tag = raw.trim().toLowerCase().replace(/\s+/g, ' ').slice(0, MAX_TAG_CHARS);
  return tag || null;
}

export function normalizeTasteTags(tags: string[], max = MAX_TASTE_TAGS) {
  const seen = new Set<string>();
  const next: string[] = [];
  for (const raw of tags) {
    const tag = normalizeTasteTag(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    next.push(tag);
    if (next.length >= max) break;
  }
  return next;
}

export function normalizeItemTags(tags: string[]) {
  return normalizeTasteTags(tags, MAX_ITEM_TAGS);
}

export type SearchableGift = {
  id: string;
  title?: string | null;
  notes?: string | null;
  tags?: string[];
};

/**
 * Strict search: rank title > item tag > owner taste tag > notes.
 * Returned hits are id+rank only so a giver UI never receives taste_tags.
 */
export function searchWishlistItemsStrict(
  items: SearchableGift[],
  query: string,
  ownerTasteTags: string[] = [],
): GiftSearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const taste = ownerTasteTags.map((tag) => tag.toLowerCase());
  const tastePrefix = taste.some((tag) => tag.startsWith(q));

  const hits: GiftSearchHit[] = [];
  for (const item of items) {
    const title = (item.title ?? '').toLowerCase();
    const notes = (item.notes ?? '').toLowerCase();
    const tags = (item.tags ?? []).map((tag) => tag.toLowerCase());
    const titleHit = title.includes(q);
    const tagHit = tags.some((tag) => tag.startsWith(q));
    const notesHit = notes.includes(q);
    if (!titleHit && !tagHit && !tastePrefix && !notesHit) continue;
    const rank = titleHit ? 1 : tagHit ? 2 : tastePrefix ? 3 : 4;
    hits.push({ id: item.id, rank });
  }
  return hits.sort((a, b) => a.rank - b.rank);
}

/** Strip any tag arrays so giver search JSON cannot leak taste_tags. */
export function strictSearchPayload(hits: GiftSearchHit[]) {
  return hits.map((hit) => ({ id: hit.id, rank: hit.rank }));
}

export function searchPayloadLeaksTags(payload: unknown): string | null {
  if (payload == null) return null;
  const json = JSON.stringify(payload);
  if (/"taste_tags"\s*:/.test(json)) return 'taste_tags';
  if (/"tags"\s*:/.test(json)) return 'tags';
  return null;
}

export function handleSearchPayloadLeaks(payload: HandleSearchHit[] | unknown): string | null {
  const json = JSON.stringify(payload);
  if (/"email"\s*:/.test(json)) return 'email';
  if (/"taste_tags"\s*:/.test(json)) return 'taste_tags';
  return null;
}

export function ownerCommentPayloadLeaks(comments: ItemGiverComment[] | null | undefined) {
  if (comments && comments.length > 0) return 'comments';
  return null;
}

export function shareTokenFromInput(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const parts = url.pathname.split('/').filter(Boolean);
    const g = parts.lastIndexOf('g');
    if (g >= 0 && parts[g + 1]) return parts[g + 1];
  } catch {
    // not a URL
  }
  const match = trimmed.match(/(?:^|\/)g\/([^/?#]+)/);
  if (match?.[1]) return match[1];
  if (/^[a-z0-9-]{3,64}$/i.test(trimmed)) return trimmed;
  return null;
}

export function assertRateLimit(
  events: { kind: GiverSocialRateKind; at: number }[],
  kind: GiverSocialRateKind,
  now = Date.now(),
) {
  const windowMs =
    kind === 'handle_search'
      ? HANDLE_SEARCH_WINDOW_MS
      : kind === 'access_request'
        ? ACCESS_REQUEST_WINDOW_MS
        : EMAIL_INVITE_WINDOW_MS;
  const limit =
    kind === 'handle_search'
      ? HANDLE_SEARCH_LIMIT
      : kind === 'access_request'
        ? ACCESS_REQUEST_LIMIT
        : EMAIL_INVITE_LIMIT;
  const count = events.filter((event) => event.kind === kind && now - event.at < windowMs).length;
  if (count >= limit) {
    throw new Error('Slow down — try again later');
  }
}

export function giverAccessChip(status: MemberAccessStatus | 'none') {
  if (status === 'pending_request') return { label: 'Waiting', tone: 'muted' as const };
  if (status === 'active') return { label: 'On the list', tone: 'brand' as const };
  if (status === 'declined') return { label: 'Declined', tone: 'muted' as const };
  if (status === 'blocked') return { label: 'Blocked', tone: 'muted' as const };
  if (status === 'revoked') return { label: 'Revoked', tone: 'muted' as const };
  return { label: 'Not on the list', tone: 'muted' as const };
}
