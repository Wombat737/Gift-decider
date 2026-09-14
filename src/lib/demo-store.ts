import { slugToken } from '@/lib/format';
import { isFunded, pledgeRemaining } from '@/lib/pledges';
import type {
  ItemPledge,
  ItemStatus,
  NewWishlistItem,
  Occasion,
  SharedWishlist,
  UpdateWishlistItem,
  Wishlist,
  WishlistItem,
} from '@/lib/types';

const DEMO_WISHLIST_ID = 'demo-wishlist';
const DEMO_OWNER_ID = 'demo-user';
export const DEMO_SHARE_TOKEN = 'demo';
const STORAGE_KEY = 'giftdecider.demo.v3';
const LEGACY_V2_KEY = 'giftdecider.demo.v2';
const LEGACY_ITEMS_KEY = 'giftdecider.demo-items.v1';

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export const demoOccasionsSeed: Occasion[] = [
  {
    id: 'demo-occasion-birthday',
    wishlist_id: DEMO_WISHLIST_ID,
    title: 'Birthday',
    share_token: 'demo-birthday',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-occasion-housewarming',
    wishlist_id: DEMO_WISHLIST_ID,
    title: 'Housewarming',
    share_token: 'demo-housewarming',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const seedItems: WishlistItem[] = [
  {
    id: 'demo-mug',
    wishlist_id: DEMO_WISHLIST_ID,
    image_path: null,
    image_url: 'https://picsum.photos/seed/giftdecider-mug/800/800',
    title: 'Speckled ceramic mug',
    notes: 'Matte oatmeal glaze, 12oz. The one from the Saturday market stall.',
    source_type: 'manual',
    source_url: null,
    buy_url: 'https://example.com/mug',
    tags: ['cozy', 'kitchen'],
    item_kind: 'exact',
    size_hint: null,
    target_amount: 42,
    occasion_id: 'demo-occasion-birthday',
    no_substitution: true,
    is_group_gift: false,
    funded_at: null,
    buy_url_dead: false,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-socks',
    wishlist_id: DEMO_WISHLIST_ID,
    image_path: null,
    image_url: 'https://picsum.photos/seed/giftdecider-socks/800/800',
    title: 'Merino hiking socks',
    notes: 'Crew height. Not the thin dress ones.',
    source_type: 'instagram',
    source_url: 'https://www.instagram.com/p/DEMO_STUB/',
    buy_url: null,
    tags: ['outdoors'],
    item_kind: 'exact',
    size_hint: null,
    target_amount: null,
    occasion_id: 'demo-occasion-birthday',
    no_substitution: false,
    is_group_gift: false,
    funded_at: null,
    buy_url_dead: false,
    status: 'reserved',
    reserved_by: 'Alex',
    reserved_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-book',
    wishlist_id: DEMO_WISHLIST_ID,
    image_path: null,
    image_url: 'https://picsum.photos/seed/giftdecider-book/800/800',
    title: 'Weeknight cookbook',
    notes: 'Something with actual weeknight timing, not 40-ingredient flex.',
    source_type: 'url',
    source_url: 'https://example.com/cookbook',
    buy_url: 'https://example.com/cookbook',
    tags: ['practical', 'food'],
    item_kind: 'exact',
    size_hint: null,
    target_amount: 45,
    occasion_id: 'demo-occasion-housewarming',
    no_substitution: false,
    is_group_gift: false,
    funded_at: null,
    buy_url_dead: false,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-plant',
    wishlist_id: DEMO_WISHLIST_ID,
    image_path: null,
    image_url: 'https://picsum.photos/seed/giftdecider-plant/800/800',
    title: 'A plant that can survive me',
    notes: 'Snake plant or pothos. Nursery pickup is fine.',
    source_type: 'manual',
    source_url: null,
    buy_url: null,
    tags: ['home', 'green'],
    item_kind: 'vibe',
    size_hint: null,
    target_amount: null,
    occasion_id: 'demo-occasion-housewarming',
    no_substitution: false,
    is_group_gift: false,
    funded_at: null,
    buy_url_dead: false,
    status: 'purchased',
    reserved_by: 'Sam',
    reserved_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-espresso',
    wishlist_id: DEMO_WISHLIST_ID,
    image_path: null,
    image_url: 'https://picsum.photos/seed/giftdecider-espresso/800/800',
    title: 'Home espresso machine',
    notes: 'Compact, not a café two-group. Happy with a solid entry machine.',
    source_type: 'manual',
    source_url: null,
    buy_url: 'https://example.com/espresso',
    tags: ['kitchen', 'coffee'],
    item_kind: 'exact',
    size_hint: null,
    target_amount: 429,
    occasion_id: 'demo-occasion-housewarming',
    no_substitution: false,
    is_group_gift: true,
    funded_at: null,
    buy_url_dead: false,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'demo-throw',
    wishlist_id: DEMO_WISHLIST_ID,
    image_path: null,
    image_url: 'https://picsum.photos/seed/giftdecider-throw/800/800',
    title: 'Washed linen throw',
    notes: 'Oatmeal or sage. Nothing neon. The listing they saved is gone.',
    source_type: 'url',
    source_url: 'https://example.com/dead-link/linen-throw',
    buy_url: 'https://example.com/dead-link/linen-throw',
    tags: ['cozy', 'home', 'soft'],
    item_kind: 'vibe',
    size_hint: null,
    target_amount: null,
    occasion_id: 'demo-occasion-housewarming',
    no_substitution: false,
    is_group_gift: false,
    funded_at: null,
    buy_url_dead: true,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

const seedPledges: ItemPledge[] = [
  {
    id: 'demo-pledge-1',
    item_id: 'demo-espresso',
    amount: 80,
    display_name: 'Alex',
    created_at: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'demo-pledge-2',
    item_id: 'demo-espresso',
    amount: 50,
    display_name: null,
    created_at: '2026-01-03T00:00:00.000Z',
  },
];

type DemoBundle = {
  items: WishlistItem[];
  occasions: Occasion[];
  pledges: ItemPledge[];
};

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function cloneItems(list: WishlistItem[]) {
  return list.map((item) => ({ ...item, tags: [...item.tags] }));
}

function occasionIdFor(raw: Partial<WishlistItem> & { id: string }) {
  if (raw.occasion_id) return raw.occasion_id;
  if (raw.id === 'demo-mug' || raw.id === 'demo-socks') return 'demo-occasion-birthday';
  if (
    raw.id === 'demo-book' ||
    raw.id === 'demo-plant' ||
    raw.id === 'demo-espresso' ||
    raw.id === 'demo-throw'
  ) {
    return 'demo-occasion-housewarming';
  }
  return null;
}

function normalizeItem(raw: Partial<WishlistItem> & { id: string }): WishlistItem {
  return {
    id: raw.id,
    wishlist_id: raw.wishlist_id ?? DEMO_WISHLIST_ID,
    image_path: raw.image_path ?? null,
    image_url: raw.image_url ?? null,
    title: raw.title ?? 'Untitled gift',
    notes: raw.notes ?? null,
    source_type: raw.source_type ?? 'manual',
    source_url: raw.source_url ?? null,
    buy_url: raw.buy_url ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    item_kind: raw.item_kind === 'vibe' ? 'vibe' : 'exact',
    size_hint: raw.size_hint ?? null,
    target_amount: typeof raw.target_amount === 'number' ? raw.target_amount : null,
    occasion_id: occasionIdFor(raw),
    no_substitution: Boolean(raw.no_substitution),
    is_group_gift: Boolean(raw.is_group_gift) || raw.id === 'demo-espresso',
    funded_at: raw.funded_at ?? null,
    buy_url_dead: Boolean(raw.buy_url_dead) || raw.id === 'demo-throw',
    status: raw.status === 'reserved' || raw.status === 'purchased' ? raw.status : 'available',
    reserved_by: raw.reserved_by ?? null,
    reserved_at: raw.reserved_at ?? null,
    created_at: raw.created_at ?? now(),
  };
}

function ensurePhase3Items(items: WishlistItem[]) {
  const known = new Set(items.map((item) => item.id));
  const extra = seedItems.filter((item) => !known.has(item.id)).map((item) => normalizeItem(item));
  return extra.length ? [...items, ...extra] : items;
}

function fallbackBundle(): DemoBundle {
  return {
    items: cloneItems(seedItems),
    occasions: demoOccasionsSeed.map((row) => ({ ...row })),
    pledges: seedPledges.map((row) => ({ ...row })),
  };
}

function parseBundle(raw: string): DemoBundle | null {
  try {
    const parsed = JSON.parse(raw) as Partial<DemoBundle>;
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    const items = ensurePhase3Items(parsed.items.map((item) => normalizeItem(item)));
    const occasions =
      Array.isArray(parsed.occasions) && parsed.occasions.length > 0
        ? parsed.occasions
        : fallbackBundle().occasions;
    const pledges = Array.isArray(parsed.pledges) ? parsed.pledges : fallbackBundle().pledges;
    return { items, occasions, pledges };
  } catch {
    return null;
  }
}

function loadBundle(): DemoBundle {
  const fallback = fallbackBundle();
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return parseBundle(raw) ?? fallback;

    const v2 = window.localStorage.getItem(LEGACY_V2_KEY);
    if (v2) return parseBundle(v2) ?? fallback;

    const legacy = window.localStorage.getItem(LEGACY_ITEMS_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as Partial<WishlistItem>[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        const items = ensurePhase3Items(
          parsed.filter((row) => row && row.id).map((row) => normalizeItem(row as WishlistItem)),
        );
        return { items, occasions: fallback.occasions, pledges: fallback.pledges };
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function saveBundle() {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, occasions, pledges }));
  } catch {
    // Private mode / quota — keep going in memory.
  }
}

let { items, occasions, pledges } = loadBundle();

export const demoWishlist: Wishlist = {
  id: DEMO_WISHLIST_ID,
  owner_id: DEMO_OWNER_ID,
  title: 'My wishlist',
  share_token: DEMO_SHARE_TOKEN,
};

export const demoSharedMeta: SharedWishlist = {
  id: DEMO_WISHLIST_ID,
  title: 'Jordan’s wishlist',
  owner_handle: 'jordan',
  owner_display_name: 'Jordan',
  occasion_id: null,
  occasion_title: null,
};

function withPledges(item: WishlistItem): WishlistItem {
  return {
    ...item,
    tags: [...item.tags],
    pledges: pledges.filter((pledge) => pledge.item_id === item.id).map((pledge) => ({ ...pledge })),
  };
}

function maybeFund(item: WishlistItem): WishlistItem {
  if (item.funded_at) return item;
  const withCurrent = withPledges(item);
  if (!isFunded(withCurrent)) return item;
  return { ...item, funded_at: now(), is_group_gift: true };
}

export function resolveDemoShare(token: string): { occasion: Occasion | null } | null {
  if (token === DEMO_SHARE_TOKEN || token === demoWishlist.share_token) {
    return { occasion: null };
  }
  const occasion = occasions.find((row) => row.share_token === token) ?? null;
  return occasion ? { occasion } : null;
}

export function isDemoShareToken(token: string) {
  return resolveDemoShare(token) !== null;
}

export function listDemoOccasions() {
  return occasions.map((row) => ({ ...row }));
}

export function listDemoItems() {
  return items.map((item) => withPledges(item));
}

export function getDemoItem(itemId: string) {
  const item = items.find((entry) => entry.id === itemId);
  return item ? withPledges(item) : null;
}

export function getDemoSharedMeta(token: string): SharedWishlist | null {
  const resolved = resolveDemoShare(token);
  if (!resolved) return null;
  if (!resolved.occasion) return { ...demoSharedMeta };
  return {
    ...demoSharedMeta,
    title: `${demoSharedMeta.title} · ${resolved.occasion.title}`,
    occasion_id: resolved.occasion.id,
    occasion_title: resolved.occasion.title,
  };
}

export function listDemoSharedItems(token: string) {
  const resolved = resolveDemoShare(token);
  if (!resolved) return [];
  const scoped = resolved.occasion
    ? items.filter((item) => item.occasion_id === resolved.occasion!.id)
    : items;
  return scoped.map((item) => withPledges(item));
}

export function addDemoItem(input: NewWishlistItem): WishlistItem {
  const item: WishlistItem = {
    id: id('item'),
    wishlist_id: DEMO_WISHLIST_ID,
    image_path: null,
    image_url: input.image_url ?? null,
    title: input.title ?? 'Untitled gift',
    notes: input.notes ?? null,
    source_type: input.source_type ?? 'manual',
    source_url: input.source_url ?? null,
    buy_url: input.buy_url ?? null,
    tags: input.tags ?? [],
    item_kind: input.item_kind ?? 'exact',
    size_hint: input.size_hint ?? null,
    target_amount: input.target_amount ?? null,
    occasion_id: input.occasion_id ?? null,
    no_substitution: input.no_substitution ?? false,
    is_group_gift: false,
    funded_at: null,
    buy_url_dead: false,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    created_at: now(),
  };
  items = [item, ...items];
  saveBundle();
  return withPledges(item);
}

export function updateDemoItem(itemId: string, patch: UpdateWishlistItem): WishlistItem {
  const current = items.find((item) => item.id === itemId);
  if (!current) throw new Error('Item not found');

  const next: WishlistItem = {
    ...current,
    title: patch.title ?? current.title,
    notes: patch.notes === undefined ? current.notes : patch.notes ?? null,
    image_url: patch.image_url === undefined ? current.image_url : patch.image_url ?? null,
    source_type: patch.source_type ?? current.source_type,
    source_url: patch.source_url === undefined ? current.source_url : patch.source_url ?? null,
    buy_url: patch.buy_url === undefined ? current.buy_url : patch.buy_url ?? null,
    tags: patch.tags ?? current.tags,
    item_kind: patch.item_kind ?? current.item_kind,
    size_hint: patch.size_hint === undefined ? current.size_hint : patch.size_hint,
    target_amount: patch.target_amount === undefined ? current.target_amount : patch.target_amount,
    occasion_id: patch.occasion_id === undefined ? current.occasion_id : patch.occasion_id,
    no_substitution: patch.no_substitution ?? current.no_substitution,
    buy_url_dead: patch.buy_url !== undefined && patch.buy_url !== current.buy_url ? false : current.buy_url_dead,
  };

  items = items.map((item) => (item.id === itemId ? next : item));
  saveBundle();
  return withPledges(next);
}

export function addDemoOccasion(title: string): Occasion {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Name this occasion');
  let token = slugToken('demo', trimmed);
  if (token === DEMO_SHARE_TOKEN || occasions.some((row) => row.share_token === token)) {
    token = `${token}-${Math.random().toString(36).slice(2, 6)}`;
  }
  const occasion: Occasion = {
    id: id('occasion'),
    wishlist_id: DEMO_WISHLIST_ID,
    title: trimmed,
    share_token: token,
    created_at: now(),
  };
  occasions = [...occasions, occasion];
  saveBundle();
  return { ...occasion };
}

export function setDemoItemStatus(itemId: string, status: ItemStatus, reservedBy?: string | null): WishlistItem {
  const current = items.find((item) => item.id === itemId);
  if (!current) throw new Error('Item not found');

  const next: WishlistItem = {
    ...current,
    status,
    reserved_by: status === 'available' ? null : reservedBy || current.reserved_by || 'A generous friend',
    reserved_at: status === 'available' ? null : current.reserved_at ?? now(),
  };

  items = items.map((item) => (item.id === itemId ? next : item));
  saveBundle();
  return withPledges(next);
}

export function setDemoGroupGift(itemId: string, isGroupGift: boolean): WishlistItem {
  const current = items.find((item) => item.id === itemId);
  if (!current) throw new Error('Item not found');
  const next: WishlistItem = { ...current, is_group_gift: isGroupGift };
  items = items.map((item) => (item.id === itemId ? next : item));
  saveBundle();
  return withPledges(next);
}

export function addDemoPledge(itemId: string, amount: number, displayName?: string | null): ItemPledge {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter an amount to chip in');
  const current = items.find((item) => item.id === itemId);
  if (!current) throw new Error('Item not found');

  const pledge: ItemPledge = {
    id: id('pledge'),
    item_id: itemId,
    amount: Math.round(amount * 100) / 100,
    display_name: displayName?.trim() || null,
    created_at: now(),
  };
  pledges = [...pledges, pledge];
  const next = maybeFund({ ...current, is_group_gift: true });
  items = items.map((item) => (item.id === itemId ? next : item));
  saveBundle();
  return { ...pledge };
}

export function markDemoItemFunded(itemId: string): WishlistItem {
  const current = items.find((item) => item.id === itemId);
  if (!current) throw new Error('Item not found');
  const next: WishlistItem = {
    ...current,
    is_group_gift: true,
    funded_at: current.funded_at ?? now(),
  };
  items = items.map((item) => (item.id === itemId ? next : item));
  saveBundle();
  return withPledges(next);
}

/** Demo-only: chip in whatever is left (or $1) and mark funded. */
export function simulateDemoFunded(itemId: string, displayName?: string | null): WishlistItem {
  const current = getDemoItem(itemId);
  if (!current) throw new Error('Item not found');
  if (!isFunded(current)) {
    const remaining = pledgeRemaining(current);
    const amount = remaining != null && remaining > 0 ? remaining : 1;
    addDemoPledge(itemId, amount, displayName ?? 'the group (demo)');
  }
  return markDemoItemFunded(itemId);
}

export function setDemoLinkDead(itemId: string, dead: boolean): WishlistItem {
  const current = items.find((item) => item.id === itemId);
  if (!current) throw new Error('Item not found');
  const next: WishlistItem = { ...current, buy_url_dead: dead };
  items = items.map((item) => (item.id === itemId ? next : item));
  saveBundle();
  return withPledges(next);
}

export function resetDemoStore() {
  const fallback = fallbackBundle();
  items = fallback.items;
  occasions = fallback.occasions;
  pledges = fallback.pledges;
  saveBundle();
}
