import { usesDemoData } from '@/lib/app-mode';
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
  listDemoNotices,
  listDemoOccasions,
  listDemoSharedItems,
  markDemoItemFunded,
  setDemoDelivery,
  setDemoGroupGift,
  setDemoItemStatus,
  setDemoLinkDead,
  setDemoOrganiser,
  setDemoPayInstructions,
  setDemoRevealAt,
  simulateDemoFunded,
  simulateDemoReveal,
  updateDemoItem,
  demoWishlist,
} from '@/lib/demo-store';
import { asDeliveryMethod, asRevealDate, readyToBuyEmailPreview, shiftLocalDate } from '@/lib/pledges';
import { healLink } from '@/lib/heal-link';
import { OWNER_ITEM_SELECT } from '@/lib/rls-contract';
import { hideReservationFromOwner, ownerSafeItem } from '@/lib/surprise-safe';
import { env } from '@/lib/env';
import { ensureOwnWorkspace } from '@/services/profile';
import type {
  DeliveryMethod,
  ItemPledge,
  ItemStatus,
  NewWishlistItem,
  Occasion,
  OrganiserNotice,
  SharedWishlist,
  UpdateWishlistItem,
  Wishlist,
  WishlistItem,
  WishlistMember,
} from '@/lib/types';

export { hideReservationFromOwner, ownerSafeItem };

type OwnedRevealRow = {
  item_id: string;
  display_name: string | null;
  reveal_at: string | null;
};

function mergePledges(items: WishlistItem[], pledges: ItemPledge[], noticeRows: OrganiserNotice[] = []): WishlistItem[] {
  return items.map((item) => ({
    ...item,
    pledges: pledges.filter((pledge) => pledge.item_id === item.id),
    notices: noticeRows.filter((row) => row.item_id === item.id),
  }));
}

function asOwnedRow(row: Record<string, unknown>): WishlistItem {
  return {
    id: String(row.id),
    wishlist_id: String(row.wishlist_id),
    image_path: (row.image_path as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    title: (row.title as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    source_type: (row.source_type as WishlistItem['source_type']) ?? 'manual',
    source_url: (row.source_url as string | null) ?? null,
    buy_url: (row.buy_url as string | null) ?? null,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    item_kind: row.item_kind === 'vibe' ? 'vibe' : 'exact',
    size_hint: (row.size_hint as string | null) ?? null,
    target_amount: row.target_amount == null ? null : Number(row.target_amount),
    occasion_id: (row.occasion_id as string | null) ?? null,
    no_substitution: Boolean(row.no_substitution),
    is_group_gift: false,
    funded_at: null,
    reveal_at: null,
    buy_url_dead: false,
    organiser_name: null,
    pay_instructions: null,
    delivery_method: null,
    delivery_note: null,
    ready_to_buy_notified_at: null,
    status: 'available',
    reserved_by: null,
    reserved_at: null,
    created_at: String(row.created_at),
  };
}

function withOwnedReveal(item: WishlistItem, rows: OwnedRevealRow[]): WishlistItem {
  const mine = rows.filter((row) => row.item_id === item.id);
  if (mine.length === 0) {
    return ownerSafeItem({ ...item, funded_at: null, reveal_at: null, is_group_gift: false, pledges: undefined });
  }
  const revealAt = asRevealDate(mine[0]?.reveal_at);
  const named = mine.filter((row) => row.display_name != null);
  return ownerSafeItem({
    ...item,
    is_group_gift: true,
    reveal_at: revealAt,
    pledges: named.map((row, index) => ({
      id: `${item.id}-reveal-${index}`,
      item_id: item.id,
      amount: 0,
      display_name: row.display_name === 'Anonymous' ? null : row.display_name,
      created_at: revealAt ?? item.created_at,
    })),
  });
}

async function listOwnedRevealedContributors(): Promise<OwnedRevealRow[]> {
  if (usesDemoData() || !supabase) return [];
  const { data, error } = await supabase.rpc('list_owned_revealed_contributors');
  if (error) throw error;
  return (data ?? []) as OwnedRevealRow[];
}

export async function getOwnedWishlist(): Promise<Wishlist | null> {
  if (usesDemoData() || !supabase) return demoWishlist;

  const { data: userData } = await supabase.auth.getUser();
  const ownerId = userData.user?.id;
  if (!ownerId) return null;

  const { data, error } = await supabase
    .from('wishlists')
    .select('id, owner_id, title, share_token')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const workspace = await ensureOwnWorkspace();
  if (!workspace) return null;
  return {
    id: workspace.wishlist_id,
    owner_id: workspace.owner_id,
    title: workspace.title,
    share_token: workspace.share_token,
  };
}

export async function listOwnedOccasions(): Promise<Occasion[]> {
  if (usesDemoData() || !supabase) return listDemoOccasions();

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

  if (usesDemoData() || !supabase) return addDemoOccasion(trimmed);

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
  if (usesDemoData() || !supabase) return listDemoItems().map(ownerSafeItem);

  const wishlist = await getOwnedWishlist();
  if (!wishlist) return [];

  const [{ data, error }, reveals] = await Promise.all([
    supabase.from('wishlist_items').select(OWNER_ITEM_SELECT).eq('wishlist_id', wishlist.id).order('created_at', {
      ascending: false,
    }),
    listOwnedRevealedContributors(),
  ]);

  if (error) throw error;
  return ((data ?? []) as Record<string, unknown>[]).map((row) => withOwnedReveal(asOwnedRow(row), reveals));
}

export async function getOwnedItem(itemId: string): Promise<WishlistItem | null> {
  if (usesDemoData() || !supabase) {
    const item = getDemoItem(itemId);
    return item ? ownerSafeItem(item) : null;
  }

  const [{ data, error }, reveals] = await Promise.all([
    supabase.from('wishlist_items').select(OWNER_ITEM_SELECT).eq('id', itemId).maybeSingle(),
    listOwnedRevealedContributors(),
  ]);

  if (error) throw error;
  if (!data) return null;
  return withOwnedReveal(asOwnedRow(data as Record<string, unknown>), reveals);
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
  if (usesDemoData() || !supabase) return ownerSafeItem(addDemoItem(input));

  const wishlist = await getOwnedWishlist();
  if (!wishlist) throw new Error('No wishlist yet — sign in again after applying migrations.');

  const { data, error } = await supabase
    .from('wishlist_items')
    .insert(ownerInsertFields(wishlist.id, input))
    .select(OWNER_ITEM_SELECT)
    .single();

  if (error) throw error;
  return ownerSafeItem(asOwnedRow(data as Record<string, unknown>));
}

export async function updateOwnedItem(itemId: string, patch: UpdateWishlistItem): Promise<WishlistItem> {
  if (usesDemoData() || !supabase) return ownerSafeItem(updateDemoItem(itemId, patch));

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
    .select(OWNER_ITEM_SELECT)
    .single();

  if (error) throw error;
  const reveals = await listOwnedRevealedContributors();
  return withOwnedReveal(asOwnedRow(data as Record<string, unknown>), reveals);
}

export async function listInvites(): Promise<WishlistMember[]> {
  if (usesDemoData() || !supabase) return [];

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

  if (usesDemoData() || !supabase) {
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
  return usesDemoData() || !supabase || isDemoShareToken(token) || token === DEMO_SHARE_TOKEN;
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

function asGiverItem(
  row: WishlistItem,
  pledges: ItemPledge[] = [],
  noticeRows: OrganiserNotice[] = [],
): WishlistItem {
  return {
    ...row,
    tags: row.tags ?? [],
    item_kind: row.item_kind ?? 'exact',
    size_hint: row.size_hint ?? null,
    target_amount: row.target_amount == null ? null : Number(row.target_amount),
    occasion_id: row.occasion_id ?? null,
    no_substitution: Boolean(row.no_substitution),
    is_group_gift: Boolean(row.is_group_gift),
    funded_at: row.funded_at ?? null,
    reveal_at: asRevealDate(row.reveal_at),
    buy_url_dead: Boolean(row.buy_url_dead),
    organiser_name: row.organiser_name ?? null,
    pay_instructions: row.pay_instructions ?? null,
    delivery_method: asDeliveryMethod(row.delivery_method),
    delivery_note: row.delivery_note ?? null,
    ready_to_buy_notified_at: row.ready_to_buy_notified_at ?? null,
    pledges: pledges.filter((pledge) => pledge.item_id === row.id),
    notices: noticeRows.filter((rowNotice) => rowNotice.item_id === row.id),
  };
}

async function loadSharedGiverExtras(token: string) {
  const [pledges, noticeRows] = await Promise.all([listSharedPledges(token), listSharedNotices(token)]);
  return { pledges, noticeRows };
}

export async function getSharedItems(token: string): Promise<WishlistItem[]> {
  if (useDemoShare(token)) {
    return listDemoSharedItems(token);
  }

  const [{ data, error }, pledges, noticeRows] = await Promise.all([
    supabase!.rpc('get_shared_wishlist_items', { p_token: token }),
    listSharedPledges(token),
    listSharedNotices(token),
  ]);
  if (error) throw error;
  return mergePledges(((data ?? []) as WishlistItem[]).map((row) => asGiverItem(row)), pledges, noticeRows);
}

export async function listSharedNotices(token: string): Promise<OrganiserNotice[]> {
  if (useDemoShare(token)) {
    return listDemoNotices(token);
  }

  const { data, error } = await supabase!.rpc('list_shared_organiser_notices', { p_token: token });
  if (error) throw error;
  return ((data ?? []) as OrganiserNotice[]).map((row) => ({
    ...row,
    kind: 'ready_to_buy',
  }));
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
  const { pledges, noticeRows } = await loadSharedGiverExtras(token);
  return asGiverItem(data as WishlistItem, pledges, noticeRows);
}

export async function setSharedGroupGift(
  token: string,
  itemId: string,
  isGroupGift: boolean,
  revealAt?: string | null,
  organiserName?: string | null,
  payInstructions?: string | null,
): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    return setDemoGroupGift(itemId, isGroupGift, revealAt, organiserName, payInstructions);
  }

  const { data, error } = await supabase!.rpc('set_shared_item_group_gift', {
    p_token: token,
    p_item_id: itemId,
    p_is_group_gift: isGroupGift,
    p_reveal_at: isGroupGift ? (asRevealDate(revealAt) ?? shiftLocalDate(1)) : null,
    p_organiser_name: organiserName ?? null,
    p_pay_instructions: payInstructions ?? null,
  });
  if (error) throw error;
  const { pledges, noticeRows } = await loadSharedGiverExtras(token);
  return asGiverItem(data as WishlistItem, pledges, noticeRows);
}

export async function setSharedOrganiser(token: string, itemId: string, organiserName: string): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    return setDemoOrganiser(itemId, organiserName);
  }
  const { data, error } = await supabase!.rpc('set_shared_item_organiser', {
    p_token: token,
    p_item_id: itemId,
    p_organiser_name: organiserName,
  });
  if (error) throw error;
  const { pledges, noticeRows } = await loadSharedGiverExtras(token);
  return asGiverItem(data as WishlistItem, pledges, noticeRows);
}

export async function setSharedPayInstructions(
  token: string,
  itemId: string,
  payInstructions: string,
): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    return setDemoPayInstructions(itemId, payInstructions);
  }
  const { data, error } = await supabase!.rpc('set_shared_item_pay_instructions', {
    p_token: token,
    p_item_id: itemId,
    p_pay_instructions: payInstructions,
  });
  if (error) throw error;
  const { pledges, noticeRows } = await loadSharedGiverExtras(token);
  return asGiverItem(data as WishlistItem, pledges, noticeRows);
}

export async function setSharedDelivery(
  token: string,
  itemId: string,
  method: DeliveryMethod,
  note?: string | null,
): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    return setDemoDelivery(itemId, method, note);
  }
  const { data, error } = await supabase!.rpc('set_shared_item_delivery', {
    p_token: token,
    p_item_id: itemId,
    p_delivery_method: method,
    p_delivery_note: note ?? null,
  });
  if (error) throw error;
  const { pledges, noticeRows } = await loadSharedGiverExtras(token);
  return asGiverItem(data as WishlistItem, pledges, noticeRows);
}

async function sendReadyToBuyEmail(item: WishlistItem) {
  const preview = readyToBuyEmailPreview(item);
  if (typeof console !== 'undefined') {
    console.info('[notify-organiser-ready-to-buy]', preview.subject, '\n', preview.text);
  }
  const functionUrl = env.supabaseUrl
    ? `${env.supabaseUrl.replace(/\/$/, '')}/functions/v1/notify-organiser-ready-to-buy`
    : '';
  if (!env.isSupabaseConfigured || !functionUrl) {
    return preview;
  }
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.supabaseAnonKey,
      },
      body: JSON.stringify({
        item_title: item.title,
        organiser_name: item.organiser_name,
        pay_instructions: item.pay_instructions,
        reveal_at: item.reveal_at,
      }),
    });
    if (!response.ok) return preview;
    const payload = (await response.json()) as { subject?: string; text?: string };
    return {
      subject: payload.subject ?? preview.subject,
      text: payload.text ?? preview.text,
    };
  } catch {
    return preview;
  }
}

async function notifyReadyToBuyIfNew(item: WishlistItem, alreadyNotified: boolean) {
  if (alreadyNotified || !item.ready_to_buy_notified_at) return;
  await sendReadyToBuyEmail(item);
}

export async function setSharedRevealAt(token: string, itemId: string, revealAt: string): Promise<WishlistItem> {
  const date = asRevealDate(revealAt);
  if (!date) throw new Error('Pick a reveal date');

  if (useDemoShare(token)) {
    return setDemoRevealAt(itemId, date);
  }

  const { data, error } = await supabase!.rpc('set_shared_item_reveal_at', {
    p_token: token,
    p_item_id: itemId,
    p_reveal_at: date,
  });
  if (error) throw error;
  const { pledges, noticeRows } = await loadSharedGiverExtras(token);
  return asGiverItem(data as WishlistItem, pledges, noticeRows);
}

export async function addSharedPledge(
  token: string,
  itemId: string,
  amount: number,
  displayName?: string,
): Promise<ItemPledge> {
  if (useDemoShare(token)) {
    const alreadyNotified = Boolean(getDemoItem(itemId)?.ready_to_buy_notified_at);
    const pledge = addDemoPledge(itemId, amount, displayName);
    const item = getDemoItem(itemId);
    if (item) await notifyReadyToBuyIfNew(item, alreadyNotified);
    return pledge;
  }

  const noticesBefore = await listSharedNotices(token);
  const alreadyNotified = noticesBefore.some((row) => row.item_id === itemId && row.kind === 'ready_to_buy');
  const { data, error } = await supabase!.rpc('add_shared_item_pledge', {
    p_token: token,
    p_item_id: itemId,
    p_amount: amount,
    p_display_name: displayName ?? null,
  });
  if (error) throw error;
  const row = data as ItemPledge;
  if (!alreadyNotified) {
    const items = await getSharedItems(token);
    const item = items.find((entry) => entry.id === itemId);
    if (item) await notifyReadyToBuyIfNew(item, alreadyNotified);
  }
  return { ...row, amount: Number(row.amount) };
}

export async function markSharedItemFunded(token: string, itemId: string): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    const alreadyNotified = Boolean(getDemoItem(itemId)?.ready_to_buy_notified_at);
    const item = markDemoItemFunded(itemId);
    await notifyReadyToBuyIfNew(item, alreadyNotified);
    return item;
  }

  const noticesBefore = await listSharedNotices(token);
  const alreadyNotified = noticesBefore.some((row) => row.item_id === itemId && row.kind === 'ready_to_buy');
  const { data, error } = await supabase!.rpc('mark_shared_item_funded', {
    p_token: token,
    p_item_id: itemId,
  });
  if (error) throw error;
  const { pledges, noticeRows } = await loadSharedGiverExtras(token);
  const item = asGiverItem(data as WishlistItem, pledges, noticeRows);
  await notifyReadyToBuyIfNew(item, alreadyNotified);
  return item;
}

export async function simulateSharedFunded(token: string, itemId: string): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    const alreadyNotified = Boolean(getDemoItem(itemId)?.ready_to_buy_notified_at);
    const item = simulateDemoFunded(itemId, 'the group (demo)');
    await notifyReadyToBuyIfNew(item, alreadyNotified);
    return item;
  }
  return markSharedItemFunded(token, itemId);
}

export async function simulateSharedReveal(
  token: string,
  itemId: string,
  which: 'today' | 'yesterday' | 'next-week',
): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    return simulateDemoReveal(itemId, which);
  }
  const days = which === 'today' ? 0 : which === 'yesterday' ? -1 : 7;
  return setSharedRevealAt(token, itemId, shiftLocalDate(days));
}

export async function setSharedLinkDead(token: string, itemId: string, dead: boolean): Promise<WishlistItem> {
  if (useDemoShare(token)) {
    return setDemoLinkDead(itemId, dead);
  }

  const { data, error } = await supabase!.rpc('set_shared_item_link_dead', {
    p_token: token,
    p_item_id: itemId,
    p_dead: dead,
  });
  if (error) throw error;
  const { pledges, noticeRows } = await loadSharedGiverExtras(token);
  return asGiverItem(data as WishlistItem, pledges, noticeRows);
}

/** Check link (demo stub + heal-link contract). Marks dead when the URL looks broken; does not auto-unmark. */
export async function runDemoLinkCheck(token: string, item: WishlistItem): Promise<WishlistItem> {
  const fromUrl = healLink({ ...item, buy_url_dead: false });
  if (fromUrl.health === 'dead') {
    return setSharedLinkDead(token, item.id, true);
  }
  return item;
}
