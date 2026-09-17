import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { getDemoItem, resetDemoStore } from './demo-store';
import {
  GIVER_ONLY_ITEM_COLUMNS,
  OWNER_ITEM_COLUMNS,
  OWNER_ITEM_SELECT,
  ownerSelectIncludesGiverColumn,
} from './rls-contract';
import { ownerPayloadLeaksGiftProgress, ownerSafeItem } from './surprise-safe';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function migration(name: string) {
  return readFileSync(join(root, 'supabase/migrations', name), 'utf8');
}

describe('Surprise-safe RLS contract', () => {
  it('owner select list never includes giver-only spoiler columns', () => {
    assert.equal(ownerSelectIncludesGiverColumn(), false);
    for (const column of GIVER_ONLY_ITEM_COLUMNS) {
      assert.equal(new RegExp(`\\b${column}\\b`).test(OWNER_ITEM_SELECT), false);
    }
    assert.match(OWNER_ITEM_SELECT, /\btitle\b/);
    assert.match(OWNER_ITEM_SELECT, /\bno_substitution\b/);
    assert.equal(OWNER_ITEM_SELECT, OWNER_ITEM_COLUMNS.join(', '));
  });

  it('SQL grant list matches the TypeScript owner / giver column contract', () => {
    const sql = migration('20260915120000_live_rls.sql');
    assert.match(sql, /revoke select on public\.wishlist_items from authenticated/i);
    assert.match(sql, /grant select \(/i);
    assert.match(sql, /owner_wishlist_items/);
    assert.match(sql, /ensure_own_workspace/);
    assert.match(sql, /GIVER_ONLY_ITEM_COLUMNS:/);
    assert.match(sql, /OWNER_ITEM_COLUMNS:/);

    const giverLine = sql.split('\n').find((line) => line.includes('GIVER_ONLY_ITEM_COLUMNS:')) ?? '';
    const ownerLine = sql.split('\n').find((line) => line.includes('OWNER_ITEM_COLUMNS:')) ?? '';

    for (const column of GIVER_ONLY_ITEM_COLUMNS) {
      assert.match(giverLine, new RegExp(`\\b${column}\\b`));
      assert.equal(new RegExp(`grant select \\([\\s\\S]*?\\b${column}\\b[\\s\\S]*?\\) on public\\.wishlist_items`, 'i').test(sql), false);
    }
    for (const column of OWNER_ITEM_COLUMNS) {
      assert.match(ownerLine, new RegExp(`\\b${column}\\b`));
      assert.match(sql, new RegExp(`grant select \\([\\s\\S]*?\\b${column}\\b`, 'i'));
    }
  });

  it('owner trigger freezes giver-only columns and share RPCs stay granted', () => {
    const sql = migration('20260915120000_live_rls.sql');
    assert.match(sql, /before insert or update on public\.wishlist_items/);
    assert.match(sql, /new\.status := old\.status/);
    assert.match(sql, /new\.buy_url_dead := old\.buy_url_dead/);
    assert.match(sql, /new\.funded_at := old\.funded_at/);
    assert.match(sql, /grant execute on function public\.ensure_own_workspace\(\) to authenticated/i);
    assert.match(sql, /revoke all on function public\.ensure_own_workspace\(\) from anon/i);

    const phase2 = migration('20260914140000_phase2.sql');
    assert.match(phase2, /grant execute on function public\.add_shared_item_pledge/);
    const organiser = migration('20260914220000_organiser.sql');
    assert.match(organiser, /list_shared_organiser_notices/);

    const reveal = migration('20260914210000_reveal_at.sql');
    assert.match(reveal, /list_owned_revealed_contributors/);
    assert.match(reveal, /current_date >= i\.reveal_at/);

    const phase3 = migration('20260914160000_phase3.sql');
    assert.match(phase3, /set_shared_item_link_dead/);

    const giverStatus = migration('20260915180000_giver_status_rpc.sql');
    assert.match(giverStatus, /create type public\.shared_gift_item/);
    assert.match(giverStatus, /set_config\('giftdecider\.giver_rpc', '1', true\)/);
    assert.match(giverStatus, /returns setof public\.shared_gift_item/);
    assert.match(giverStatus, /returns public\.shared_gift_item/);
    assert.match(giverStatus, /status public\.item_status/);
    assert.match(giverStatus, /grant execute on function public\.set_shared_item_status/);
    assert.equal(giverStatus.includes('Coral Coast'), false);
    assert.equal(giverStatus.includes('#E85D4C'), false);

    const giverRefresh = migration('20260916140000_giver_list_refresh.sql');
    assert.match(giverRefresh, /create or replace function public\.get_shared_wishlist_items/);
    assert.match(giverRefresh, /volatile/i);
    assert.match(giverRefresh, /grant execute on function public\.get_shared_wishlist_items/);

    const socialA = migration('20260918090000_giver_social_foundations.sql');
    assert.match(socialA, /search_profiles_by_handle/);
    assert.match(socialA, /giver_people/);
    const socialB = migration('20260918100000_item_giver_comments.sql');
    assert.match(socialB, /item_giver_comments_deny_owner/);
    const socialC = migration('20260918110000_taste_tags_search.sql');
    assert.match(socialC, /search_wishlist_items/);
    assert.match(socialC, /shared_gift_search_hit/);
  });

  it('owner helper still strips reserve / funded / heal / pledges', () => {
    resetDemoStore();
    const socks = ownerSafeItem(getDemoItem('demo-socks')!);
    const throwItem = ownerSafeItem(getDemoItem('demo-throw')!);
    const espresso = ownerSafeItem(getDemoItem('demo-espresso')!);
    assert.equal(socks.status, 'available');
    assert.equal(socks.reserved_by, null);
    assert.equal(throwItem.buy_url_dead, false);
    assert.equal(espresso.funded_at, null);
    assert.equal(espresso.pledges, undefined);
    assert.equal(ownerPayloadLeaksGiftProgress(socks), null);
    assert.equal(ownerPayloadLeaksGiftProgress(throwItem), null);
    assert.equal(ownerPayloadLeaksGiftProgress(espresso), null);
  });
});
