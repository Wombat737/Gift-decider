import { supabase } from '@/lib/supabase';
import {
  addDemoItem,
  addDemoOccasion,
  addDemoPledge,
  DEMO_SHARE_TOKEN,
  getDemoItem,
  getDemoSharedMeta,
  isDemoShareToken,
  listDemoItems,
  listDemoOccasions,
  listDemoSharedItems,
  setDemoGroupGift,
  setDemoItemStatus,
  updateDemoItem,
  demoWishlist,
} from '@/lib/demo-store';
import type {
  ItemPledge,
  ItemStatus,
  NewWishlistItem,
  Occasion,
  SharedWishlist,
  UpdateWishlistItem,
  Wishlist,
  WishlistItem,
  WishlistMember,
} from '@/lib/types';

function ownerSafeItem(item: WishlistItem): WishlistItem {
  return {
    ...item,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    is_group_gift: false,
    pledges: undefined,
  };
}

function mergePledges(items: WishlistItem[], pledges: ItemPledge[]): WishlistItem[] {
  return items.map((item) => ({
    ...item,
    pledges: pledges.filter((pledge) => pledge.item_id === item.id),
  }));
}

/** Owner/recipient payloads must not include reservation, group-gift, or pledge fields. */
export function hideReservationFromOwner(item: WishlistItem): WishlistItem {
  return ownerSafeItem(item);
}

export async function getOwnedWishlist(): Promise<Wishlist | null> {
  if (!supabase) return demoWishlist;

  const { data, error } = await supabase
    .from('wishlists')
    .select('id, owner_id, title, share_token')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listOwnedOccasions(): Promise<Occasion[]> {
  if (!supabase) return listDemoOccasions();

  const wishlist = await getOwnedWishlist();
  if (!wishlist) return [];

  const { data, error } = await supabase
    .from('occasions')
    .select('id, wishlist_id, title, share_token, created_at')
    .eq('wishlist_id', wishlist.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Occasion[];
}

export async function createOccasion(title: string): Promise<Occasion> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Name this occasion');

  if (!supabase) return addDemoOccasion(trimmed);

  const wishlist = await getOwnedWishlist();
  if (!wishlist) throw new Error('No wishlist yet — sign in again after applying migrations.');

  const { data, error } = await supabase
    .from('occasions')
    .insert({ wishlist_id: wishlist.id, title: trimmed })
    .select('id, wishlist_id, title, share_token, created_at')
    .single();

  if (error) throw error;
  return data as Occasion;
}

export async function listOwnedItems(): Promise<WishlistItem[]> {
  if (!supabase) return listDemoItems().map(ownerSafeItem);

  const wishlist = await getOwnedWishlist();
  if (!wishlist) return [];

  const { data, error } = await supabase
    .from('wishlist_items')
    .select(
      'id, wishlist_id, image_path, image_url, title, notes, source_type, source_url, buy_url, tags, item_kind, size_hint, target_amount, occasion_id, no_substitution, created_at',
    )
    .eq('wishlist_id', wishlist.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as Omit<WishlistItem, 'status' | 'reserved_by' | 'reserved_at' | 'is_group_gift'>[]).map(
    (row) =>
      ownerSafeItem({
        ...row,
        tags: row.tags ?? [],
        item_kind: row.item_kind ?? 'exact',
        size_hint: row.size_hint ?? null,
        target_amount: row.target_amount == null ? null : Number(row.target_amount),
        occasion_id: row.occasion_id ?? null,
        no_substitution: Boolean(row.no_substitution),
        is_group_gift: false,
        status: 'available',
        reserved_by: null,
        reserved_at: null,
      }),
  );
}

export async function getOwnedItem(itemId: string): Promise<WishlistItem | null> {
  if (!supabase) {
    const item = getDemoItem(itemId);
    return item ? ownerSafeItem(item) : null;
  }

  const { data, error } = await supabase
    .from('wishlist_items')
    .select(
      'id, wishlist_id, image_path, image_url, title, notes, source_type, source_url, buy_url, tags, item_kind, size_hint, target_amount, occasion_id, no_substitution, created_at',
    )
    .eq('id', itemId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const row = data as Omit<WishlistItem, 'status' | 'reserved_by' | 'reserved_at' | 'is_group_gift'>;
  return ownerSafeItem({
    ...row,
    tags: row.tags ?? [],
    item_kind: row.item_kind ?? 'exact',
    size_hint: row.size_hint ?? null,
    target_amount: row.target_amount == null ? null : Number(row.target_amount),
    occasion_id: row.occasion_id ?? null,
    no_substitution: Boolean(row.no_substitution),
    is_group_gift: false,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
  });
}

const ownerInsertFields = (wishlistId: string, input: NewWishlistItem) => ({
  wishlist_id: wishlistId,
  title: input.title ?? 'Untitled gift',
  notes: input.notes ?? null,
  image_url: input.image_url ?? null,
  source_type: input.source_type ?? 'manual',
  source_url: input.source_url ?? null,
  buy_url: input.buy_url ?? null,
  tags: input.tags ?? [],
  item_kind: input.item_kind ?? 'exact',
  size_hint: input.size_hint ?? null,
  target_amount: input.target_amount ?? null,
  occasion_id: input.occasion_id ?? null,
  no_substitution: input.no_substitution ?? false,
});

export async function createItem(input: NewWishlistItem): Promise<WishlistItem> {
  if (!supabase) return ownerSafeItem(addDemoItem(input));

  const wishlist = await getOwnedWishlist();
  if (!wishlist) throw new Error('No wishlist yet — sign in again after applying migrations.');

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert(ownerInsertFields(wishlist.id, input))
    .select(
      'id, wishlist_id, image_path, image_url, title, notes, source_type, source_url, buy_url, tags, item_kind, size_hint, target_amount, occasion_id, no_substitution, created_at',
    )
    .single();

  if (error) throw error;
  const row = data as Omit<WishlistItem, 'status' | 'reserved_by' | 'reserved_at' | 'is_group_gift'>;
  return ownerSafeItem({
    ...row,
    tags: row.tags ?? [],
    item_kind: row.item_kind ?? 'exact',
    size_hint: row.size_hint ?? null,
    target_amount: row.target_amount == null ? null : Number(row.target_amount),
    occasion_id: row.occasion_id ?? null,
    no_substitution: Boolean(row.no_substitution),
    is_group_gift: false,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
  });
}

export async function updateOwnedItem(itemId: string, patch: UpdateWishlistItem): Promise<WishlistItem> {
  if (!supabase) return ownerSafeItem(updateDemoItem(itemId, patch));

  const payload: Record<string, unknown> = {};
  if (patch.title !== undefined) payload.title = patch.title;
  if (patch.notes !== undefined) payload.notes = patch.notes;
  if (patch.image_url !== undefined) payload.image_url = patch.image_url;
  if (patch.source_type !== undefined) payload.source_type = patch.source_type;
  if (patch.source_url !== undefined) payload.source_url = patch.source_url;
  if (patch.buy_url !== undefined) payload.buy_url = patch.buy_url;
  if (patch.tags !== undefined) payload.tags = patch.tags;
  if (patch.item_kind !== undefined) payload.item_kind = patch.item_kind;
  if (patch.size_hint !== undefined) payload.size_hint = patch.size_hint;
  if (patch.target_amount !== undefined) payload.target_amount = patch.target_amount;
  if (patch.occasion_id !== undefined) payload.occasion_id = patch.occasion_id;
  if (patch.no_substitution !== undefined) payload.no_substitution = patch.no_substitution;

  const { data, error } = await supabase
    .from('wishlist_items')
    .update(payload)
    .eq('id', itemId)
    .select(
      'id, wishlist_id, image_path, image_url, title, notes, source_type, source_url, buy_url, tags, item_kind, size_hint, target_amount, occasion_id, no_substitution, created_at',
    )
    .single();

  if (error) throw error;
  const row = data as Omit<WishlistItem, 'status' | 'reserved_by' | 'reserved_at' | 'is_group_gift'>;
  return ownerSafeItem({
    ...row,
    tags: row.tags ?? [],
    item_kind: row.item_kind ?? 'exact',
    size_hint: row.size_hint ?? null,
    target_amount: row.target_amount == null ? null : Number(row.target_amount),
    occasion_id: row.occasion_id ?? null,
    no_substitution: Boolean(row.no_substitution),
    is_group_gift: false,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
  });
}

export async function listInvites(): Promise<WishlistMember[]> {
  if (!supabase) return [];

  const wishlist = await getOwnedWishlist();
  if (!wishlist) return [];

  const { data, error } = await supabase
    .from('wishlist_members')
    .select('*')
    .eq('wishlist_id', wishlist.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WishlistMember[];
}

export async function inviteByEmail(email: string): Promise<WishlistMember | { stub: true; email: string }> {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) throw new Error('Enter an email');

  if (!supabase) {
    return { stub: true, email: trimmed };
  }

  const wishlist = await getOwnedWishlist();
  if (!wishlist) throw new Error('No wishlist to share');

  const { data, error } = await supabase
    .from('wishlist_members')
    .insert({
      wishlist_id: wishlist.id,
      email: trimmed,
      role: 'viewer',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as WishlistMember;
}

function useDemoShare(token: string) {
  return !supabase || isDemoShareToken(token) || token === DEMO_SHARE_TOKEN;
}

export async function getSharedWishlist(token: string): Promise<SharedWishlist | null> {
  if (useDemoShare(token)) {
    return getDemoSharedMeta(token);
  }

  const { data, error } = await supabase!.rpc('get_shared_wishlist', { p_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as SharedWishlist) ?? null;
}

function asGiverItem(row: WishlistItem, pledges: ItemPledge[] = []): WishlistItem {
  return {
    ...row,
    tags: row.tags ?? [],
    item_kind: row.item_kind ?? 'exact',
    size_hint: row.size_hint ?? null,
    target_amount: row.target_amount == null ? null : Number(row.target_amount),
    occasion_id: row.occasion_id ?? null,
    no_substitution: Boolean(row.no_substitution),
    is_group_gift: Boolean(row.is_group_gift),
    pledges: pledges.filter((pledge) => pledge.item_id === row.id),
  };
}

export async function getSharedItems(token: string): Promise<WishlistItem[]> {
  if (useDemoShare(token)) {
    return listDemoSharedItems(token);
  }

  const [{ data, error }, pledges] = await Promise.all([
    supabase!.rpc('get_shared_wishlist_items', { p_token: token }),
    listSharedPledges(token),
  ]);
  if (error) throw error;
  return mergePledges(((data ?? []) as WishlistItem[]).map((row) => asGiverItem(row)), pledges);
}

export async function listSharedPledges(token: string): Promise<ItemPledge[]> {
  if (useDemoShare(token)) {
    return listDemoSharedItems(token).flatMap((item) => item.pledges ?? []);
  }

  const { data, error } = await supabase!.rpc('list_shared_item_pledges', { p_token: token });
  if (error) throw error;
  return ((data ?? []) as ItemPledge[]).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

export async function setSharedItemStatus(
  token: string,
  itemId: string,
  status: ItemStatus,
  reservedBy?: string,
): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    return setDemoItemStatus(itemId, status, reservedBy);
  }

  const { data, error } = await supabase!.rpc('set_shared_item_status', {
    p_token: token,
    p_item_id: itemId,
    p_status: status,
    p_reserved_by: reservedBy ?? null,
  });

  if (error) throw error;
  const pledges = await listSharedPledges(token);
  return asGiverItem(data as WishlistItem, pledges);
}

export async function setSharedGroupGift(token: string, itemId: string, isGroupGift: boolean): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    return setDemoGroupGift(itemId, isGroupGift);
  }

  const { data, error } = await supabase!.rpc('set_shared_item_group_gift', {
    p_token: token,
    p_item_id: itemId,
    p_is_group_gift: isGroupGift,
  });
  if (error) throw error;
  const pledges = await listSharedPledges(token);
  return asGiverItem(data as WishlistItem, pledges);
}

export async function addSharedPledge(
  token: string,
  itemId: string,
  amount: number,
  displayName?: string,
): Promise<ItemPledge> {
  if (useDemoShare(token)) {
    return addDemoPledge(itemId, amount, displayName);
  }

  const { data, error } = await supabase!.rpc('add_shared_item_pledge', {
    p_token: token,
    p_item_id: itemId,
    p_amount: amount,
    p_display_name: displayName ?? null,
  });
  if (error) throw error;
  const row = data as ItemPledge;
  return { ...row, amount: Number(row.amount) };
}
