import { supabase } from '@/lib/supabase';
import {
  addDemoItem,
  DEMO_SHARE_TOKEN,
  demoSharedMeta,
  demoWishlist,
  getDemoItem,
  listDemoItems,
  setDemoItemStatus,
} from '@/lib/demo-store';
import type {
  ItemStatus,
  NewWishlistItem,
  SharedWishlist,
  Wishlist,
  WishlistItem,
  WishlistMember,
} from '@/lib/types';

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

export async function listOwnedItems(): Promise<WishlistItem[]> {
  if (!supabase) return listDemoItems();

  const wishlist = await getOwnedWishlist();
  if (!wishlist) return [];

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('wishlist_id', wishlist.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as WishlistItem[];
}

export async function getOwnedItem(itemId: string): Promise<WishlistItem | null> {
  if (!supabase) return getDemoItem(itemId);

  const { data, error } = await supabase
    .from('wishlist_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  if (error) throw error;
  return data as WishlistItem | null;
}

export async function createItem(input: NewWishlistItem): Promise<WishlistItem> {
  if (!supabase) return addDemoItem(input);

  const wishlist = await getOwnedWishlist();
  if (!wishlist) throw new Error('No wishlist yet — sign in again after applying migrations.');

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert({
      wishlist_id: wishlist.id,
      title: input.title ?? 'Untitled gift',
      notes: input.notes ?? null,
      image_url: input.image_url ?? null,
      source_type: input.source_type ?? 'manual',
      source_url: input.source_url ?? null,
      buy_url: input.buy_url ?? null,
      tags: input.tags ?? [],
      no_substitution: input.no_substitution ?? false,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as WishlistItem;
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

export async function getSharedWishlist(token: string): Promise<SharedWishlist | null> {
  if (!supabase || token === DEMO_SHARE_TOKEN) {
    return token === DEMO_SHARE_TOKEN || token === demoWishlist.share_token ? demoSharedMeta : null;
  }

  const { data, error } = await supabase.rpc('get_shared_wishlist', { p_token: token });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return (row as SharedWishlist) ?? null;
}

export async function getSharedItems(token: string): Promise<WishlistItem[]> {
  if (!supabase || token === DEMO_SHARE_TOKEN) {
    if (token !== DEMO_SHARE_TOKEN && token !== demoWishlist.share_token) return [];
    return listDemoItems();
  }

  const { data, error } = await supabase.rpc('get_shared_wishlist_items', { p_token: token });
  if (error) throw error;
  return (data ?? []) as WishlistItem[];
}

export async function setSharedItemStatus(
  token: string,
  itemId: string,
  status: ItemStatus,
  reservedBy?: string,
): Promise<WishlistItem> {
  if (!supabase || token === DEMO_SHARE_TOKEN) {
    return setDemoItemStatus(itemId, status, reservedBy);
  }

  const { data, error } = await supabase.rpc('set_shared_item_status', {
    p_token: token,
    p_item_id: itemId,
    p_status: status,
    p_reserved_by: reservedBy ?? null,
  });

  if (error) throw error;
  return data as WishlistItem;
}
