import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { listDemoItems, resetDemoStore } from './demo-store';
import {
  inviteDemoGiverByEmail,
  listDemoCommentTagCandidates,
  listDemoGiverAccessRequests,
  listDemoGiverPeople,
  listDemoItemGiverComments,
  lookupDemoProfileByEmail,
  markDemoItemGiverMentionsRead,
  postDemoItemGiverComment,
  respondDemoGiverAccess,
  searchDemoProfilesByHandle,
  searchDemoWishlistItems,
} from './demo-social';
import {
  applyMention,
  canGiverOpenWishlist,
  classifyPeopleSearchQuery,
  commentBodyParts,
  commentFromRow,
  commentVisibleOnOwnerItem,
  extractMentionHandles,
  filterTagCandidates,
  giverCanUseComments,
  handleSearchPayloadLeaks,
  isCommentSchemaMiss,
  looksLikeEmailQuery,
  matchesHandleSearch,
  mentionQueryAt,
  normalizeTasteTags,
  ownerMayReadGiverComments,
  searchPayloadLeaksTags,
  searchWishlistItemsStrict,
  shareTokenFromInput,
  strictSearchPayload,
  threadComments,
  unreadMentionCount,
} from './giver-social';
import { ownerPayloadLeaksGiftProgress, ownerSafeItem } from './surprise-safe';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

function migration(name: string) {
  return readFileSync(join(root, 'supabase/migrations', name), 'utf8');
}

describe('Giver social A — handle search, pins, access gate', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('handle search is prefix/exact on handle, never display name, never private', () => {
    assert.equal(
      matchesHandleSearch({ handle: 'mum', displayName: 'Jordan', query: '@mum', discoverability: 'handle' }),
      true,
    );
    assert.equal(
      matchesHandleSearch({ handle: 'mumhandle', query: 'mum', discoverability: 'handle' }),
      true,
    );
    assert.equal(
      matchesHandleSearch({ handle: 'sam', displayName: 'Mum Smith', query: 'mum', discoverability: 'handle' }),
      false,
    );
    assert.equal(
      matchesHandleSearch({ handle: 'secretpat', displayName: 'Coral Coast', query: 'secret', discoverability: 'private' }),
      false,
    );
    assert.equal(matchesHandleSearch({ handle: 'jordan', query: 'j', discoverability: 'handle' }), false);

    const hits = searchDemoProfilesByHandle('mum');
    assert.ok(hits.some((hit) => hit.handle === 'mum'));
    assert.equal(hits.some((hit) => hit.handle === 'secretpat'), false);
    assert.equal(handleSearchPayloadLeaks(hits), null);
    assert.equal(searchDemoProfilesByHandle('Coral').length, 0);
    assert.equal(searchDemoProfilesByHandle('coast').length, 0);
  });

  it('pin is free; opening items needs accept or share/public link', () => {
    assert.equal(
      canGiverOpenWishlist({ memberStatus: 'pending_request', hasShareToken: false, isPublicLink: false }),
      false,
    );
    assert.equal(
      canGiverOpenWishlist({ memberStatus: 'pending_request', hasShareToken: true, isPublicLink: false }),
      true,
    );
    assert.equal(
      canGiverOpenWishlist({ memberStatus: 'none', hasShareToken: false, isPublicLink: true }),
      true,
    );
    assert.equal(
      canGiverOpenWishlist({ memberStatus: 'active', accepted: true, hasShareToken: false, isPublicLink: false }),
      true,
    );
    assert.equal(
      canGiverOpenWishlist({ memberStatus: 'declined', hasShareToken: false, isPublicLink: false }),
      false,
    );

    const people = listDemoGiverPeople();
    const mum = people.find((row) => row.handle === 'mum');
    const priya = people.find((row) => row.handle === 'priya');
    assert.ok(mum);
    assert.equal(mum.can_open, false);
    assert.equal(mum.share_token, null);
    assert.equal(mum.access_status, 'pending_request');
    assert.ok(priya);
    assert.equal(priya.can_open, true);
    assert.equal(priya.share_token, 'demo');
  });

  it('owner inbox shows requester name only — no spoiler fields', () => {
    const inbox = listDemoGiverAccessRequests();
    assert.ok(inbox.length >= 1);
    const json = JSON.stringify(inbox);
    assert.match(json, /Alex/);
    assert.equal(/status|reserved|pledge|comment|taste_tags/i.test(json), false);
    respondDemoGiverAccess(inbox[0]!.member_id, 'decline');
    assert.equal(listDemoGiverAccessRequests().some((row) => row.member_id === inbox[0]!.member_id), false);
  });

  it('People surfaces a + / Add someone control on empty and populated', () => {
    const people = source('src/app/(app)/people.tsx');
    const empty = source('src/components/empty-state.tsx');
    assert.match(people, /PrettyCopy\.peopleCta/);
    assert.match(people, /headerRight/);
    assert.match(people, /FlairIcon name="add"/);
    assert.match(people, /actionLabel=\{PrettyCopy\.peopleCta\}/);
    assert.match(people, /actionIcon="add"/);
    assert.match(people, /footer=\{/);
    assert.match(people, /nativePress icon="add" label=\{PrettyCopy\.peopleCta\}/);
    assert.match(people, /searchProfilesByHandle/);
    assert.match(people, /lookupProfileByEmail/);
    assert.match(people, /classifyPeopleSearchQuery/);
    assert.match(people, /inviteGiverByEmail/);
    assert.equal(/shareTokenFromInput/.test(people), false);
    assert.equal(/Paste a share link/.test(people), false);
    assert.match(source('src/lib/copy.ts'), /handle or email/i);
    assert.match(empty, /actionIcon/);
  });

  it('Add someone search routes handle vs email by input shape', () => {
    assert.equal(classifyPeopleSearchQuery('@mumhandle'), 'handle');
    assert.equal(classifyPeopleSearchQuery('mum'), 'handle');
    assert.equal(classifyPeopleSearchQuery('mum@'), 'handle');
    assert.equal(classifyPeopleSearchQuery('mum@giftdecider'), 'handle');
    assert.equal(looksLikeEmailQuery('mum@giftdecider.local'), true);
    assert.equal(classifyPeopleSearchQuery('mum@giftdecider.local'), 'email');
    assert.equal(classifyPeopleSearchQuery('  Priya@Example.com  '), 'email');

    const mum = lookupDemoProfileByEmail('mum@giftdecider.local');
    assert.equal(mum.length, 1);
    assert.equal(mum[0]?.handle, 'mum');
    assert.equal(handleSearchPayloadLeaks(mum), null);
    assert.equal(lookupDemoProfileByEmail('nobody@example.com').length, 0);
    assert.equal(lookupDemoProfileByEmail('@mum').length, 0);
  });

  it('email invite stubs unknown addresses and parses share links', () => {
    const stub = inviteDemoGiverByEmail('new.mum@example.com');
    assert.equal('kind' in stub && stub.kind, 'stub');
    assert.equal(shareTokenFromInput('https://wombat737.github.io/Gift-decider/g/demo-birthday'), 'demo-birthday');
    assert.equal(shareTokenFromInput('demo'), 'demo');
  });

  it('SQL foundations: discoverability, giver_people, status, RPCs, rate/block stubs', () => {
    const sql = migration('20260918090000_giver_social_foundations.sql');
    assert.match(sql, /discoverability/);
    assert.match(sql, /giver_people/);
    assert.match(sql, /pending_request/);
    assert.match(sql, /search_profiles_by_handle/);
    assert.match(sql, /request_giver_access/);
    assert.match(sql, /respond_giver_access/);
    assert.match(sql, /claim_share_as_giver/);
    assert.match(sql, /giver_blocks/);
    assert.match(sql, /assert_giver_social_rate/);
    assert.match(sql, /handle_search/);
    assert.match(sql, /m\.status = 'active'/);
    assert.equal(/display_name ilike/i.test(sql), false);
    assert.equal(/select[\s\S]*email/i.test(sql.split('search_profiles_by_handle')[1]?.slice(0, 800) ?? 'select email'), false);

    const lookupSql = migration('20260918120000_lookup_profile_by_email.sql');
    assert.match(lookupSql, /lookup_profile_by_email/);
    assert.match(lookupSql, /auth\.users/);
    assert.match(lookupSql, /grant execute on function public\.lookup_profile_by_email\(text\) to authenticated/);
    assert.match(lookupSql, /revoke all on function public\.lookup_profile_by_email\(text\) from anon, public/);
    assert.equal(/p\.email|u\.email as/i.test(lookupSql), false);
  });
});

describe('Giver social B — comments surprise-safe', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('owner may never read comments; owner UI has no thread', () => {
    assert.equal(ownerMayReadGiverComments(), false);
    assert.equal(commentVisibleOnOwnerItem(), false);
    assert.equal(
      giverCanUseComments({ loggedIn: true, isOwner: true, memberStatus: 'active' }),
      false,
    );
    assert.equal(
      giverCanUseComments({ loggedIn: false, isOwner: false, memberStatus: 'active' }),
      false,
    );
    assert.equal(
      giverCanUseComments({ loggedIn: true, isOwner: false, memberStatus: 'pending_request' }),
      false,
    );
    assert.equal(
      giverCanUseComments({ loggedIn: true, isOwner: false, memberStatus: 'active' }),
      true,
    );

    const ownerRoute = listDemoItemGiverComments('demo-mug', { isOwnerRoute: true, loggedIn: true });
    assert.deepEqual(ownerRoute, []);
    const giverRoute = listDemoItemGiverComments('demo-mug', { isOwnerRoute: false, loggedIn: true });
    assert.ok(giverRoute.length >= 1);
    assert.equal(giverRoute[0]?.author_display_name, 'Alex');

    const ownerItem = source('src/app/(app)/item/[id].tsx');
    const giverItem = source('src/app/g/[token]/[itemId].tsx');
    assert.equal(/GiverComments/.test(ownerItem), false);
    assert.equal(/listItemGiverComments/.test(ownerItem), false);
    assert.equal(/comment/i.test(ownerItem), false);
    assert.match(giverItem, /GiverComments/);
    assert.match(giverItem, /footer=\{/);
    const footerChunk = giverItem.slice(giverItem.indexOf('footer={'), giverItem.indexOf('}>'));
    assert.equal(/GiverComments/.test(footerChunk), false);

    const owner = ownerSafeItem(listDemoItems().find((item) => item.id === 'demo-mug')!);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);
  });

  it('SQL comments: owner deny, anon cannot post, no comment_count on items', () => {
    const sql = migration('20260918100000_item_giver_comments.sql');
    assert.match(sql, /item_giver_comments/);
    assert.match(sql, /item_giver_comments_deny_owner/);
    assert.match(sql, /as restrictive/);
    assert.match(sql, /is_active_giver/);
    assert.match(sql, /list_item_giver_comments/);
    assert.match(sql, /post_item_giver_comment/);
    assert.match(sql, /revoke all on function public\.post_item_giver_comment\(uuid, text\) from anon/);
    assert.match(sql, /raise exception 'Not allowed'/);
    assert.equal(/comment_count/.test(sql), false);
    assert.equal(/grant execute on function public\.post_item_giver_comment\(uuid, text\) to anon/.test(sql), false);
  });

  it('demo giver persona can post; owner route still empty', () => {
    const posted = postDemoItemGiverComment('demo-mug', 'Size 12 if they have it', { demoGiverPersona: true });
    assert.equal(posted.body.includes('Size 12'), true);
    assert.equal(posted.parent_id, null);
    assert.equal(listDemoItemGiverComments('demo-mug', { isOwnerRoute: true, loggedIn: true }).length, 0);
    assert.throws(() => postDemoItemGiverComment('demo-mug', 'nope', { demoGiverPersona: false }));
  });

  it('keeps existing giver notes as root comments and threads one reply', () => {
    const giverRoute = listDemoItemGiverComments('demo-mug', { isOwnerRoute: false, loggedIn: true });
    const alex = giverRoute.find((row) => row.id === 'demo-comment-mug-1');
    const sam = giverRoute.find((row) => row.id === 'demo-comment-mug-2');
    assert.equal(alex?.body, 'I’ll grab this unless someone else is already on it.');
    assert.equal(alex?.parent_id, null);
    assert.equal(sam?.parent_id, 'demo-comment-mug-1');
    assert.equal(sam?.unread, true);
    assert.equal(sam?.mentions[0]?.handle, 'jordan');
    assert.equal(unreadMentionCount(giverRoute), 1);

    const threads = threadComments(giverRoute);
    assert.equal(threads[0]?.comment.id, 'demo-comment-mug-1');
    assert.equal(threads[0]?.replies[0]?.id, 'demo-comment-mug-2');
    assert.equal(listDemoItemGiverComments('demo-mug', { isOwnerRoute: true, loggedIn: true }).length, 0);

    const legacy = commentFromRow({
      id: 'note-1',
      item_id: 'demo-mug',
      author_id: 'demo-person-alex',
      author_display_name: 'Alex',
      body: 'old giver note',
      created_at: '2026-09-01T00:00:00.000Z',
      edited_at: null,
    });
    assert.equal(legacy?.body, 'old giver note');
    assert.equal(legacy?.parent_id, null);
    assert.deepEqual(legacy?.mentions, []);
    assert.equal(legacy?.unread, false);
    assert.equal(threadComments(legacy ? [legacy] : []).length, 1);
  });

  it('replies once, @tags list members, and clears the unread mention', () => {
    const tags = listDemoCommentTagCandidates();
    assert.deepEqual(
      tags.map((person) => person.handle),
      ['alex', 'sam'],
    );
    assert.equal(tags.some((person) => person.id === 'demo-user'), false);
    assert.equal(filterTagCandidates(tags, 'al').map((person) => person.handle).join(','), 'alex');
    assert.equal(mentionQueryAt('leaving this @al', 'leaving this @al'.length), 'al');
    const inserted = applyMention('leaving this @al', 'leaving this @al'.length, 'alex');
    assert.equal(inserted.body, 'leaving this @alex ');
    assert.deepEqual(extractMentionHandles('email@alex.com ping @alex'), ['alex']);
    assert.equal(commentBodyParts('ping @alex').some((part) => part.kind === 'tag' && part.text === '@alex'), true);
    assert.equal(commentBodyParts('email@alex.com').every((part) => part.kind === 'text'), true);

    const reply = postDemoItemGiverComment('demo-mug', '@alex I’ll leave the mug', {
      demoGiverPersona: true,
      parentId: 'demo-comment-mug-1',
      mentionIds: ['demo-person-alex'],
    });
    assert.equal(reply.parent_id, 'demo-comment-mug-1');
    assert.equal(reply.mentions.some((mention) => mention.handle === 'alex'), true);
    assert.throws(
      () =>
        postDemoItemGiverComment('demo-mug', 'too deep', {
          demoGiverPersona: true,
          parentId: reply.id,
        }),
      /one level/,
    );

    assert.equal(unreadMentionCount(listDemoItemGiverComments('demo-mug', { isOwnerRoute: false, loggedIn: true })), 1);
    markDemoItemGiverMentionsRead('demo-mug');
    const after = listDemoItemGiverComments('demo-mug', { isOwnerRoute: false, loggedIn: true });
    assert.equal(unreadMentionCount(after), 0);
    assert.equal(after.find((row) => row.id === 'demo-comment-mug-2')?.body.includes('@jordan'), true);
    assert.equal(listDemoItemGiverComments('demo-mug', { isOwnerRoute: true, loggedIn: true }).length, 0);
  });

  it('SQL threads stay giver-only and a missing migration is detectable', () => {
    const sql = migration('20261009120000_giver_comment_threads.sql');
    assert.match(sql, /existing giver notes/i);
    assert.match(sql, /parent_id/);
    assert.match(sql, /item_giver_comment_mentions_deny_owner/);
    assert.match(sql, /item_giver_comments_deny_owner/);
    assert.match(sql, /as restrictive/);
    assert.match(sql, /not public\.is_wishlist_owner/);
    assert.match(sql, /list_comment_tag_candidates/);
    assert.match(sql, /mark_item_giver_comment_mentions_read/);
    assert.match(sql, /Replies are one level deep/);
    assert.match(sql, /owner_id/);
    assert.match(sql, /revoke all on function public\.list_comment_tag_candidates\(uuid\) from anon/);
    assert.match(sql, /grant execute on function public\.post_item_giver_comment\(uuid, text, uuid, uuid\[\]\) to authenticated/);
    assert.equal(/delete from public\.item_giver_comments\b/i.test(sql), false);
    assert.equal(/\btruncate\s+(table\s+)?public\./i.test(sql), false);
    assert.equal(/comment_count/.test(sql), false);
    assert.equal(/grant execute on function public\.list_item_giver_comments\(uuid\) to anon/.test(sql), false);
    assert.equal(/grant select on public\.item_giver_comment_mentions to anon/.test(sql), false);

    const ui = source('src/components/giver-comments.tsx');
    assert.match(ui, /Comments/);
    assert.match(ui, /Post comment/);
    assert.match(ui, /Post reply/);
    assert.match(ui, /filterTagCandidates/);
    assert.match(ui, /commentBodyParts/);
    assert.equal(/Giver notes/.test(ui), false);
    assert.equal(/Post note/.test(ui), false);
    assert.equal(/GiverComments/.test(source('src/app/(app)/item/[id].tsx')), false);

    assert.equal(isCommentSchemaMiss({ code: 'PGRST202', message: 'Could not find the function in the schema cache' }), true);
    assert.equal(isCommentSchemaMiss({ message: 'Not allowed' }), false);
    assert.equal(isCommentSchemaMiss({ message: 'Replies are one level deep' }), false);
  });
});

describe('Giver social C — strict tag search', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('search ranks title > item tag > taste tag > notes and never returns tag arrays', () => {
    const items = listDemoItems();
    const hits = searchWishlistItemsStrict(items, 'linen', ['linen', 'trail running']);
    const payload = strictSearchPayload(hits);
    assert.equal(searchPayloadLeaksTags(payload), null);
    assert.equal(searchPayloadLeaksTags(hits), null);
    assert.ok(hits.some((hit) => hit.id === 'demo-throw'));
    assert.equal(
      hits.find((hit) => hit.id === 'demo-throw')?.rank,
      1,
    );

    const demoHits = searchDemoWishlistItems('linen');
    assert.equal(searchPayloadLeaksTags(demoHits), null);
    assert.ok(demoHits.every((hit) => Object.keys(hit).sort().join(',') === 'id,rank'));
  });

  it('giver browse has a search field and no tag chips; recipient editor is owner-only', () => {
    const giverList = source('src/app/g/[token]/index.tsx');
    const giverItem = source('src/app/g/[token]/[itemId].tsx');
    const people = source('src/app/(app)/people.tsx');
    const settings = source('src/app/(app)/settings.tsx');
    const card = source('src/components/item-card.tsx');
    assert.match(giverList, /Search gifts/);
    assert.equal(/VibeChips/.test(giverList), false);
    assert.equal(/TasteTagEditor/.test(giverList), false);
    assert.equal(/taste_tags/.test(giverList), false);
    assert.match(giverItem, /GiverComments/);
    assert.match(people, /Handle or email/);
    assert.match(people, /FieldHelp\.findSomeone/);
    assert.match(source('src/lib/help.ts'), /Display names are not searchable/);
    assert.match(people, /PrettyCopy\.peopleCta/);
    assert.match(people, /headerRight/);
    assert.match(people, /accessibilityLabel=\{PrettyCopy\.peopleCta\}/);
    assert.match(people, /icon="add"/);
    assert.match(people, /actionLabel=\{PrettyCopy\.peopleCta\}/);
    assert.match(people, /Invite by email/);
    assert.equal(/Paste a share link/.test(people), false);
    assert.match(people, /nativePress/);
    assert.match(giverList, /PrettyCopy\.peopleCta/);
    assert.match(giverList, /\/people\?add=1/);
    assert.match(giverList, /headerRight/);
    assert.match(settings, /TasteTagEditor/);
    assert.match(settings, /Discoverability/);
    assert.match(card, /!showStatus && item\.tags\.length/);
  });

  it('SQL search is strict: id+rank, GIN, no taste_tags in the result type', () => {
    const sql = migration('20260918110000_taste_tags_search.sql');
    assert.match(sql, /taste_tags/);
    assert.match(sql, /using gin/);
    assert.match(sql, /search_wishlist_items/);
    assert.match(sql, /search_shared_wishlist_items/);
    assert.match(sql, /shared_gift_search_hit/);
    assert.match(sql, /id uuid,\s*rank integer/s);
    const hitType = sql.slice(sql.indexOf('shared_gift_search_hit'), sql.indexOf('search_wishlist_items'));
    assert.equal(/tags/.test(hitType), false);
    assert.equal(/taste_tags/.test(hitType), false);
    assert.match(sql, /raise exception 'Not allowed'/);
    assert.match(sql, /grant execute on function public\.search_shared_wishlist_items\(text, text\) to anon, authenticated/);
  });

  it('normalizes tags: lowercase, trim, collapse spaces, caps', () => {
    assert.deepEqual(normalizeTasteTags(['  Linen  ', 'LINEN', 'trail   running', '']), [
      'linen',
      'trail running',
    ]);
    const many = Array.from({ length: 40 }, (_, i) => `tag${i}`);
    assert.equal(normalizeTasteTags(many).length, 30);
  });
});
