import type { ItemStatus, NewWishlistItem, SharedWishlist, Wishlist, WishlistItem } from '@/lib/types';

const DEMO_WISHLIST_ID = 'demo-wishlist';
const DEMO_OWNER_ID = 'demo-user';
export const DEMO_SHARE_TOKEN = 'demo';
const STORAGE_KEY = 'giftdecider.demo-items.v1';

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

const seed: WishlistItem[] = [
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
    tags: ['kitchen', 'coffee'],
    no_substitution: true,
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
    no_substitution: false,
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
    tags: ['books', 'food'],
    no_substitution: false,
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
    tags: ['home'],
    no_substitution: false,
    status: 'purchased',
    reserved_by: 'Sam',
    reserved_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
  },
];

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function loadItems(): WishlistItem[] {
  if (!canUseStorage()) return seed.map((item) => ({ ...item }));
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed.map((item) => ({ ...item }));
    const parsed = JSON.parse(raw) as WishlistItem[];
    if (!Array.isArray(parsed) || parsed.length === 0) return seed.map((item) => ({ ...item }));
    return parsed;
  } catch {
    return seed.map((item) => ({ ...item }));
  }
}

function saveItems(next: WishlistItem[]) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode / quota — keep going in memory.
  }
}

let items = loadItems();

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
};

export function listDemoItems() {
  return items.map((item) => ({ ...item }));
}

export function getDemoItem(itemId: string) {
  return items.find((item) => item.id === itemId) ?? null;
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
    no_substitution: input.no_substitution ?? false,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    created_at: now(),
  };
  items = [item, ...items];
  saveItems(items);
  return { ...item };
}

export function setDemoItemStatus(
  itemId: string,
  status: ItemStatus,
  reservedBy?: string | null,
): WishlistItem {
  const current = items.find((item) => item.id === itemId);
  if (!current) {
    throw new Error('Item not found');
  }

  const next: WishlistItem = {
    ...current,
    status,
    reserved_by: status === 'available' ? null : reservedBy || current.reserved_by || 'A generous friend',
    reserved_at: status === 'available' ? null : current.reserved_at ?? now(),
  };

  items = items.map((item) => (item.id === itemId ? next : item));
  saveItems(items);
  return { ...next };
}
