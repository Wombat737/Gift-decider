import type {
  CommentMention,
  CommentTagCandidate,
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

/** `@handle` stays a handle. Email needs `@` plus a dotted domain. */
export function looksLikeEmailQuery(raw: string) {
  const q = raw.trim();
  if (!q || q.startsWith('@')) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(q);
}

export function classifyPeopleSearchQuery(raw: string): 'email' | 'handle' {
  return looksLikeEmailQuery(raw) ? 'email' : 'handle';
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

const MENTION_TOKEN = /@([a-zA-Z0-9_]{3,30})/g;

export type CommentBodyPart = { kind: 'text' | 'tag'; text: string };

export type CommentThread = {
  comment: ItemGiverComment;
  replies: ItemGiverComment[];
};

function asMention(entry: unknown): CommentMention | null {
  if (!entry || typeof entry !== 'object') return null;
  const record = entry as Record<string, unknown>;
  if (record.user_id == null && record.id == null) return null;
  return {
    user_id: String(record.user_id ?? record.id),
    handle: typeof record.handle === 'string' ? record.handle : null,
    display_name: typeof record.display_name === 'string' ? record.display_name : null,
  };
}

function asMentions(value: unknown): CommentMention[] {
  let raw = value;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    const mention = asMention(entry);
    return mention ? [mention] : [];
  });
}

/**
 * Flat giver notes (rows from before threading) become root comments.
 * Missing parent / mention fields default so an old RPC payload still renders.
 */
export function commentFromRow(row: Record<string, unknown>): ItemGiverComment | null {
  if (row.id == null || row.body == null || row.item_id == null) return null;
  return {
    id: String(row.id),
    item_id: String(row.item_id),
    author_id: String(row.author_id ?? ''),
    author_display_name: String(row.author_display_name ?? 'A giver'),
    body: String(row.body),
    created_at: String(row.created_at ?? ''),
    edited_at: (row.edited_at as string | null) ?? null,
    parent_id: row.parent_id ? String(row.parent_id) : null,
    mentions: asMentions(row.mentions),
    unread: Boolean(row.unread),
  };
}

export function extractMentionHandles(body: string): string[] {
  const found = new Set<string>();
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const start = match.index ?? 0;
    const prev = start > 0 ? body[start - 1] : '';
    if (prev && /[a-zA-Z0-9_]/.test(prev)) continue;
    if (match[1]) found.add(match[1].toLowerCase());
  }
  return [...found];
}

/** Text before the cursor ends in @query — empty string means "just typed @". */
export function mentionQueryAt(body: string, cursor: number): string | null {
  const safe = Math.max(0, Math.min(cursor, body.length));
  const before = body.slice(0, safe);
  const match = before.match(/(?:^|\s)@([a-zA-Z0-9_]*)$/);
  if (!match) return null;
  return match[1].toLowerCase();
}

export function mentionToken(person: CommentTagCandidate): string | null {
  if (person.handle && /^[a-zA-Z0-9_]{3,30}$/.test(person.handle)) return person.handle.toLowerCase();
  const slug = (person.display_name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '')
    .slice(0, 30);
  if (/^[a-z0-9_]{3,30}$/.test(slug)) return slug;
  return null;
}

export function applyMention(body: string, cursor: number, handle: string): { body: string; cursor: number } {
  const token = handle.replace(/^@+/, '').trim();
  if (!token) return { body, cursor };
  const safe = Math.max(0, Math.min(cursor, body.length));
  const before = body.slice(0, safe);
  const match = before.match(/(^|\s)@([a-zA-Z0-9_]*)$/);
  const insertion = `@${token} `;
  if (!match || match.index == null) {
    const next = `${before}${insertion}${body.slice(safe)}`;
    return { body: next, cursor: before.length + insertion.length };
  }
  const at = match.index + match[1].length;
  const next = `${body.slice(0, at)}${insertion}${body.slice(safe)}`;
  return { body: next, cursor: at + insertion.length };
}

export function filterTagCandidates(candidates: CommentTagCandidate[], query: string): CommentTagCandidate[] {
  const q = query.trim().toLowerCase().replace(/^@+/, '');
  return candidates
    .filter((person) => {
      if (!mentionToken(person)) return false;
      if (!q) return true;
      const handle = person.handle?.toLowerCase() ?? '';
      const name = person.display_name?.toLowerCase() ?? '';
      return handle.startsWith(q) || name.startsWith(q) || name.split(/\s+/).some((part) => part.startsWith(q));
    })
    .slice(0, 6);
}

export function mentionIdsForBody(body: string, candidates: CommentTagCandidate[], extraIds: string[] = []) {
  const handles = new Set(extractMentionHandles(body));
  const ids = new Set(extraIds);
  for (const person of candidates) {
    const token = mentionToken(person);
    if (token && handles.has(token)) ids.add(person.id);
  }
  return [...ids];
}

export function commentBodyParts(body: string): CommentBodyPart[] {
  const parts: CommentBodyPart[] = [];
  let last = 0;
  for (const match of body.matchAll(MENTION_TOKEN)) {
    const start = match.index ?? 0;
    const prev = start > 0 ? body[start - 1] : '';
    if (prev && /[a-zA-Z0-9_]/.test(prev)) continue;
    if (start > last) parts.push({ kind: 'text', text: body.slice(last, start) });
    parts.push({ kind: 'tag', text: match[0] });
    last = start + match[0].length;
  }
  if (last < body.length) parts.push({ kind: 'text', text: body.slice(last) });
  if (!parts.length) parts.push({ kind: 'text', text: body });
  return parts;
}

/** One level. A reply whose parent is missing stays visible as its own root so nothing is dropped. */
export function threadComments(comments: ItemGiverComment[]): CommentThread[] {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  const replyBuckets = new Map<string, ItemGiverComment[]>();
  const roots: ItemGiverComment[] = [];

  for (const comment of comments) {
    const parent = comment.parent_id ? byId.get(comment.parent_id) : undefined;
    if (!parent) {
      roots.push(comment);
      continue;
    }
    const rootId = parent.parent_id && byId.has(parent.parent_id) ? parent.parent_id : parent.id;
    const bucket = replyBuckets.get(rootId) ?? [];
    bucket.push(comment);
    replyBuckets.set(rootId, bucket);
  }

  return roots.map((comment) => ({
    comment,
    replies: replyBuckets.get(comment.id) ?? [],
  }));
}

export function unreadMentionCount(comments: ItemGiverComment[]) {
  return comments.reduce((count, comment) => count + (comment.unread ? 1 : 0), 0);
}

export function removeCommentThread(comments: ItemGiverComment[], commentId: string) {
  const drop = new Set([commentId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const row of comments) {
      if (row.parent_id && drop.has(row.parent_id) && !drop.has(row.id)) {
        drop.add(row.id);
        grew = true;
      }
    }
  }
  return comments.filter((row) => !drop.has(row.id));
}

/** PostgREST / Postgres "function or argument not migrated yet". Real denials are not a miss. */
export function isCommentSchemaMiss(
  error: { message?: string; code?: string; details?: string } | null | undefined,
) {
  if (!error) return false;
  const blob = `${error.code ?? ''} ${error.message ?? ''} ${error.details ?? ''}`;
  if (/not allowed/i.test(blob)) return false;
  return /PGRST202|PGRST204|42883|could not find the function|schema cache|could not find the [\w. ]*column|function [\w.]+ does not exist/i.test(
    blob,
  );
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
