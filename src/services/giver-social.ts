import { usesDemoData } from '@/lib/app-mode';
import { env } from '@/lib/env';
import { isDemoShareToken } from '@/lib/demo-store';
import {
  deleteDemoItemGiverComment,
  demoOwnerHasTasteTags,
  editDemoItemGiverComment,
  inviteDemoGiverByEmail,
  listDemoGiverAccessRequests,
  listDemoGiverPeople,
  listDemoItemGiverComments,
  postDemoItemGiverComment,
  requestDemoGiverAccess,
  respondDemoGiverAccess,
  lookupDemoProfileByEmail,
  searchDemoProfilesByHandle,
  searchDemoWishlistItems,
  unlistDemoGiverPerson,
} from '@/lib/demo-social';
import { shouldUseDemoShare } from '@/lib/giver-catalog';
import { supabase } from '@/lib/supabase';
import { searchPayloadLeaksTags, strictSearchPayload } from '@/lib/giver-social';
import type {
  GiverAccessRequest,
  GiverPerson,
  GiftSearchHit,
  HandleSearchHit,
  ItemGiverComment,
  MemberAccessStatus,
} from '@/lib/types';

function rpcError(error: { message?: string; details?: string; hint?: string }) {
  const detail = [error.message, error.details, error.hint].filter(Boolean).join(' — ');
  return new Error(detail || 'Could not complete that');
}

function asAccessStatus(value: unknown): MemberAccessStatus | 'none' {
  if (
    value === 'active' ||
    value === 'pending_request' ||
    value === 'declined' ||
    value === 'revoked' ||
    value === 'blocked'
  ) {
    return value;
  }
  return 'none';
}

function asPerson(row: Record<string, unknown>): GiverPerson {
  return {
    id: String(row.id),
    recipient_id: String(row.recipient_id),
    handle: (row.handle as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    label: (row.label as string | null) ?? null,
    access_status: asAccessStatus(row.access_status),
    can_open: Boolean(row.can_open),
    share_token: (row.share_token as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

function asHit(row: Record<string, unknown>): HandleSearchHit {
  return {
    id: String(row.id),
    handle: (row.handle as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    access_status: asAccessStatus(row.access_status),
    can_open: Boolean(row.can_open),
    share_token: (row.share_token as string | null) ?? null,
    is_public_link: Boolean(row.is_public_link),
  };
}

function asRequest(row: Record<string, unknown>): GiverAccessRequest {
  return {
    member_id: String(row.member_id),
    giver_id: (row.giver_id as string | null) ?? null,
    handle: (row.handle as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

function asComment(row: Record<string, unknown>): ItemGiverComment {
  return {
    id: String(row.id),
    item_id: String(row.item_id),
    author_id: String(row.author_id),
    author_display_name: String(row.author_display_name ?? 'A giver'),
    body: String(row.body ?? ''),
    created_at: String(row.created_at),
    edited_at: (row.edited_at as string | null) ?? null,
  };
}

export async function listGiverPeople(): Promise<GiverPerson[]> {
  if (usesDemoData() || !supabase) return listDemoGiverPeople();
  const { data, error } = await supabase.rpc('list_giver_people');
  if (error) throw rpcError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(asPerson);
}

export async function unlistGiverPerson(pinId: string) {
  if (usesDemoData() || !supabase) {
    unlistDemoGiverPerson(pinId);
    return;
  }
  const { error } = await supabase.rpc('unlist_giver_person', { p_pin_id: pinId });
  if (error) throw rpcError(error);
}

export async function searchProfilesByHandle(query: string): Promise<HandleSearchHit[]> {
  if (usesDemoData() || !supabase) return searchDemoProfilesByHandle(query);
  const { data, error } = await supabase.rpc('search_profiles_by_handle', { p_q: query });
  if (error) throw rpcError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(asHit);
}

export async function lookupProfileByEmail(email: string): Promise<HandleSearchHit[]> {
  if (usesDemoData() || !supabase) return lookupDemoProfileByEmail(email);
  const { data, error } = await supabase.rpc('lookup_profile_by_email', { p_email: email });
  if (error) throw rpcError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(asHit);
}

export async function requestGiverAccess(recipientId: string) {
  if (usesDemoData() || !supabase) return requestDemoGiverAccess(recipientId);
  const { data, error } = await supabase.rpc('request_giver_access', { p_recipient_id: recipientId });
  if (error) throw rpcError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return row as { status: string; share_token: string | null; can_open?: boolean };
}

export async function inviteGiverByEmail(email: string) {
  if (usesDemoData() || !supabase) return inviteDemoGiverByEmail(email);
  const { data, error } = await supabase.rpc('invite_giver_by_email', { p_email: email });
  if (error) throw rpcError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return row as { kind: string; email: string; status: string };
}

export async function listGiverAccessRequests(): Promise<GiverAccessRequest[]> {
  if (usesDemoData() || !supabase) return listDemoGiverAccessRequests();
  const { data, error } = await supabase.rpc('list_giver_access_requests');
  if (error) throw rpcError(error);
  return ((data ?? []) as Record<string, unknown>[]).map(asRequest);
}

export async function respondGiverAccess(memberId: string, action: 'accept' | 'decline' | 'block') {
  if (usesDemoData() || !supabase) {
    respondDemoGiverAccess(memberId, action);
    return;
  }
  const { error } = await supabase.rpc('respond_giver_access', { p_member_id: memberId, p_action: action });
  if (error) throw rpcError(error);
}

export async function claimShareAsGiver(token: string) {
  if (usesDemoData() || !supabase || isDemoShareToken(token)) return;
  const { error } = await supabase.rpc('claim_share_as_giver', { p_token: token });
  if (error) {
    // Non-blocking: share-token view/reserve still works without a member row.
    if (typeof console !== 'undefined') console.info('[claim_share_as_giver]', error.message);
  }
}

export async function listItemGiverComments(
  itemId: string,
  opts: { isOwnerRoute: boolean; loggedIn: boolean },
): Promise<ItemGiverComment[]> {
  if (opts.isOwnerRoute) return [];
  if (usesDemoData() || !supabase) return listDemoItemGiverComments(itemId, opts);
  if (!opts.loggedIn) return [];
  const { data, error } = await supabase.rpc('list_item_giver_comments', { p_item_id: itemId });
  if (error) {
    if (/not allowed/i.test(error.message ?? '')) return [];
    throw rpcError(error);
  }
  return ((data ?? []) as Record<string, unknown>[]).map(asComment);
}

export async function postItemGiverComment(
  itemId: string,
  body: string,
  opts: { demoGiverPersona: boolean },
): Promise<ItemGiverComment> {
  if (usesDemoData() || !supabase) return postDemoItemGiverComment(itemId, body, opts);
  const { data, error } = await supabase.rpc('post_item_giver_comment', { p_item_id: itemId, p_body: body });
  if (error) throw rpcError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return asComment(row as Record<string, unknown>);
}

export async function editItemGiverComment(commentId: string, body: string): Promise<ItemGiverComment> {
  if (usesDemoData() || !supabase) return editDemoItemGiverComment(commentId, body);
  const { data, error } = await supabase.rpc('edit_item_giver_comment', { p_comment_id: commentId, p_body: body });
  if (error) throw rpcError(error);
  const row = Array.isArray(data) ? data[0] : data;
  return asComment(row as Record<string, unknown>);
}

export async function deleteItemGiverComment(commentId: string) {
  if (usesDemoData() || !supabase) {
    deleteDemoItemGiverComment(commentId);
    return;
  }
  const { error } = await supabase.rpc('delete_item_giver_comment', { p_comment_id: commentId });
  if (error) throw rpcError(error);
}

export async function searchSharedWishlistItems(token: string, query: string): Promise<GiftSearchHit[]> {
  const q = query.trim();
  if (!q) return [];

  if (shouldUseDemoShare(token, Boolean(env.isSupabaseConfigured && supabase))) {
    return strictSearchPayload(searchDemoWishlistItems(q));
  }

  const { data, error } = await supabase!.rpc('search_shared_wishlist_items', { p_token: token, p_q: q });
  if (error) throw rpcError(error);
  const hits = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    rank: Number(row.rank ?? 99),
  }));
  if (searchPayloadLeaksTags(hits) || searchPayloadLeaksTags(data)) {
    return strictSearchPayload(hits);
  }
  return strictSearchPayload(hits);
}

export function ownerTasteTagsHint(hasTags: boolean) {
  if (hasTags) return null;
  return 'Search gifts — add taste tags on the list for better hits';
}

export async function giverSearchEmptyHint(): Promise<string | null> {
  if (usesDemoData() || !supabase) {
    return ownerTasteTagsHint(demoOwnerHasTasteTags());
  }
  // Strict: do not fetch taste_tags for a giver. Hint only when the owner
  // has zero tags — demo has them; live skips the owner-facing count.
  return null;
}
