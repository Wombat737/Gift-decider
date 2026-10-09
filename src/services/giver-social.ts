import { usesDemoData } from '@/lib/app-mode';
import { env } from '@/lib/env';
import { isDemoShareToken } from '@/lib/demo-store';
import {
  deleteDemoItemGiverComment,
  demoOwnerHasTasteTags,
  editDemoItemGiverComment,
  inviteDemoGiverByEmail,
  blockDemoGiver,
  listDemoBlockedGivers,
  listDemoCommentTagCandidates,
  listDemoGiverAccessRequests,
  listDemoGiverPeople,
  listDemoItemGiverComments,
  lookupDemoProfileByEmail,
  markDemoItemGiverMentionsRead,
  postDemoItemGiverComment,
  reportDemoItemGiverComment,
  requestDemoGiverAccess,
  respondDemoGiverAccess,
  searchDemoProfilesByHandle,
  searchDemoWishlistItems,
  unblockDemoGiver,
  unlistDemoGiverPerson,
} from '@/lib/demo-social';
import { shouldUseDemoShare } from '@/lib/giver-catalog';
import { supabase } from '@/lib/supabase';
import { commentFromRow, isCommentSchemaMiss, searchPayloadLeaksTags, strictSearchPayload } from '@/lib/giver-social';
import type {
  CommentTagCandidate,
  GiverAccessRequest,
  GiverPerson,
  BlockedGiver,
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

export type PostedGiverComment = {
  comment: ItemGiverComment;
  /** Reply was saved as a root comment because the thread migration is not applied yet. */
  postedWithoutThread: boolean;
  /** @tags stayed in the text; mention rows are not stored until the migration is applied. */
  mentionsDeferred: boolean;
};

function commentRow(data: unknown): ItemGiverComment {
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  const comment = row ? commentFromRow(row) : null;
  if (!comment) throw new Error('Could not read that comment');
  return comment;
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
  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const comment = commentFromRow(row);
    return comment ? [comment] : [];
  });
}

export async function listCommentTagCandidates(
  itemId: string,
  opts: { loggedIn: boolean; demoGiverPersona: boolean },
): Promise<CommentTagCandidate[]> {
  if (!opts.loggedIn && !opts.demoGiverPersona) return [];
  if (usesDemoData() || !supabase) return listDemoCommentTagCandidates();
  const { data, error } = await supabase.rpc('list_comment_tag_candidates', { p_item_id: itemId });
  if (error) {
    if (isCommentSchemaMiss(error) || /not allowed/i.test(error.message ?? '')) return [];
    throw rpcError(error);
  }
  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: String(row.id),
    handle: (row.handle as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
  }));
}

export async function markItemGiverCommentMentionsRead(itemId: string) {
  if (usesDemoData() || !supabase) {
    markDemoItemGiverMentionsRead(itemId);
    return;
  }
  const { error } = await supabase.rpc('mark_item_giver_comment_mentions_read', { p_item_id: itemId });
  if (error) {
    // Unread dots are best-effort. A missing migration must not block the thread.
    return;
  }
}

export async function postItemGiverComment(
  itemId: string,
  body: string,
  opts: { demoGiverPersona: boolean; parentId?: string | null; mentionIds?: string[] },
): Promise<PostedGiverComment> {
  if (usesDemoData() || !supabase) {
    return {
      comment: postDemoItemGiverComment(itemId, body, opts),
      postedWithoutThread: false,
      mentionsDeferred: false,
    };
  }
  const parentId = opts.parentId ?? null;
  const mentionIds = opts.mentionIds ?? [];
  const extended = await supabase.rpc('post_item_giver_comment', {
    p_item_id: itemId,
    p_body: body,
    p_parent_id: parentId,
    p_mention_ids: mentionIds,
  });
  if (!extended.error) {
    return { comment: commentRow(extended.data), postedWithoutThread: false, mentionsDeferred: false };
  }
  if (!isCommentSchemaMiss(extended.error)) throw rpcError(extended.error);

  const fallback = await supabase.rpc('post_item_giver_comment', { p_item_id: itemId, p_body: body });
  if (fallback.error) throw rpcError(fallback.error);
  return {
    comment: commentRow(fallback.data),
    postedWithoutThread: Boolean(parentId),
    mentionsDeferred: mentionIds.length > 0,
  };
}

export async function editItemGiverComment(
  commentId: string,
  body: string,
  mentionIds: string[] = [],
): Promise<ItemGiverComment> {
  if (usesDemoData() || !supabase) return editDemoItemGiverComment(commentId, body, mentionIds);
  const extended = await supabase.rpc('edit_item_giver_comment', {
    p_comment_id: commentId,
    p_body: body,
    p_mention_ids: mentionIds,
  });
  if (extended.error && isCommentSchemaMiss(extended.error)) {
    const fallback = await supabase.rpc('edit_item_giver_comment', { p_comment_id: commentId, p_body: body });
    if (fallback.error) throw rpcError(fallback.error);
    return commentRow(fallback.data);
  }
  if (extended.error) throw rpcError(extended.error);
  return commentRow(extended.data);
}

export async function deleteItemGiverComment(commentId: string) {
  if (usesDemoData() || !supabase) {
    deleteDemoItemGiverComment(commentId);
    return;
  }
  const { error } = await supabase.rpc('delete_item_giver_comment', { p_comment_id: commentId });
  if (error) throw rpcError(error);
}

function asBlocked(row: Record<string, unknown>): BlockedGiver {
  return {
    id: String(row.id),
    handle: (row.handle as string | null) ?? null,
    display_name: (row.display_name as string | null) ?? null,
    blocked_at: String(row.blocked_at ?? ''),
  };
}

export async function reportItemGiverComment(commentId: string, reason: string, details: string) {
  if (usesDemoData() || !supabase) {
    reportDemoItemGiverComment(commentId, reason, details);
    return;
  }
  const { error } = await supabase.rpc('report_item_giver_comment', {
    p_comment_id: commentId,
    p_reason: reason,
    p_details: details.trim() || null,
  });
  if (error) {
    if (isCommentSchemaMiss(error)) throw new Error('Reporting is not available yet.');
    throw rpcError(error);
  }
}

export async function blockGiver(userId: string) {
  if (usesDemoData() || !supabase) {
    blockDemoGiver(userId);
    return;
  }
  const { error } = await supabase.rpc('block_user', { p_user_id: userId });
  if (error) {
    if (isCommentSchemaMiss(error)) throw new Error('Blocking is not available yet.');
    throw rpcError(error);
  }
}

export async function unblockGiver(userId: string) {
  if (usesDemoData() || !supabase) {
    unblockDemoGiver(userId);
    return;
  }
  const { error } = await supabase.rpc('unblock_user', { p_user_id: userId });
  if (error) {
    if (isCommentSchemaMiss(error)) throw new Error('Unblocking is not available yet.');
    throw rpcError(error);
  }
}

export async function listBlockedGivers(): Promise<BlockedGiver[]> {
  if (usesDemoData() || !supabase) return listDemoBlockedGivers();
  const { data, error } = await supabase.rpc('list_blocked_users');
  if (error) {
    if (isCommentSchemaMiss(error)) throw new Error('Blocked people are not available yet.');
    throw rpcError(error);
  }
  return ((data ?? []) as Record<string, unknown>[]).map(asBlocked);
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
