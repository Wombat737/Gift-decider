import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { getDemoItem, resetDemoStore } from './demo-store';
import {
  beginGiverCatalogWrite,
  giverListPaint,
  giverPaintItems,
  giverShareRoute,
  invalidateGiverCatalog,
  isGiverCatalogHydrated,
  lastGiverShareToken,
  openGiverShare,
  openLastGiverShare,
  peekGiverCatalog,
  reduceGiverListLoad,
  resetGiverCatalog,
  shareTokenFromPathname,
  shareTokenFromRoute,
  shareTokenFromSegments,
  shareTokenParam,
  wouldCommitLoadedEmpty,
  writeGiverCatalog,
  type GiverListLoadState,
} from './giver-catalog';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

const idle: GiverListLoadState = {
  token: undefined,
  loading: true,
  fetchSettled: false,
  itemCount: 0,
};

describe('People → list first open never commits loaded+empty before fetch settles', () => {
  beforeEach(() => {
    resetDemoStore();
    resetGiverCatalog();
  });

  it('rejects Expo Router placeholder tokens so they cannot fetch-settle empty', () => {
    assert.equal(shareTokenParam('[token]'), undefined);
    assert.equal(shareTokenParam('undefined'), undefined);
    assert.equal(shareTokenParam(['[token]']), undefined);
    assert.equal(shareTokenFromPathname('/g/[token]'), undefined);
    assert.equal(shareTokenFromPathname('/g/%5Btoken%5D'), undefined);
    assert.equal(shareTokenFromSegments(['g', '[token]']), undefined);
    assert.equal(
      shareTokenFromRoute({ local: '[token]', global: '[token]', pathname: '/g/[token]', segments: ['g', '[token]'] }),
      undefined,
    );
    assert.equal(shareTokenFromPathname('/g/a1b2c3d4e5f6'), 'a1b2c3d4e5f6');
    assert.equal(
      shareTokenFromRoute({ local: undefined, global: undefined, pathname: '/people' }),
      undefined,
    );
  });

  it('fails if loaded + empty is committed before the live fetch settles', () => {
    // #26.2 painted empty whenever loading=false, even with hydrated=false.
    // That is the family-soak bug: People first open settled the giver empty hero
    // from a placeholder token / timeout, then back+open remounted with the real token.
    assert.equal(
      wouldCommitLoadedEmpty({
        token: 'family-share',
        loading: false,
        fetchSettled: false,
        hydrated: false,
        itemCount: 0,
      }),
      false,
    );
    assert.equal(
      giverListPaint({
        token: 'family-share',
        loading: false,
        fetchSettled: false,
        itemCount: 0,
      }),
      'skeleton',
    );
    assert.equal(
      giverListPaint({
        token: undefined,
        loading: false,
        fetchSettled: false,
        itemCount: 0,
      }),
      'skeleton',
    );
    assert.equal(
      giverListPaint({
        token: '[token]',
        loading: false,
        fetchSettled: true,
        itemCount: 0,
      }),
      'skeleton',
    );
    assert.equal(
      wouldCommitLoadedEmpty({
        token: 'family-share',
        loading: false,
        fetchSettled: true,
        settledToken: 'family-share',
        itemCount: 0,
      }),
      true,
    );
    assert.equal(
      giverListPaint({
        token: 'family-share',
        loading: false,
        fetchSettled: true,
        settledToken: 'family-share',
        itemCount: 0,
      }),
      'empty',
    );
    assert.equal(
      giverListPaint({
        token: 'family-share',
        loading: false,
        fetchSettled: true,
        settledToken: 'family-share',
        itemCount: 3,
      }),
      'grid',
    );
  });

  it('People → list reducer stays on skeleton through placeholder, timeout, and in-flight empty', () => {
    let state = reduceGiverListLoad(idle, { type: 'route', token: '[token]' });
    assert.equal(state.token, undefined);
    assert.equal(giverListPaint(state), 'skeleton');
    assert.equal(wouldCommitLoadedEmpty(state), false);

    state = reduceGiverListLoad(state, { type: 'loading-false-without-fetch' });
    assert.equal(giverListPaint(state), 'skeleton');
    assert.equal(wouldCommitLoadedEmpty(state), false);

    state = reduceGiverListLoad(state, { type: 'route', token: 'family-share' });
    assert.equal(state.token, 'family-share');
    assert.equal(state.fetchSettled, false);
    assert.equal(giverListPaint(state), 'skeleton');

    state = reduceGiverListLoad(state, { type: 'fetch-start', token: 'family-share' });
    state = reduceGiverListLoad(state, { type: 'loading-false-without-fetch' });
    assert.equal(giverListPaint(state), 'skeleton');
    assert.equal(wouldCommitLoadedEmpty(state), false);

    state = reduceGiverListLoad(state, { type: 'fetch-settle', token: 'stale-other', itemCount: 0 });
    assert.equal(giverListPaint(state), 'skeleton');

    state = reduceGiverListLoad(state, { type: 'fetch-settle', token: 'family-share', itemCount: 4 });
    assert.equal(giverListPaint(state), 'grid');

    let emptyList = reduceGiverListLoad(idle, { type: 'route', token: 'quiet-share' });
    emptyList = reduceGiverListLoad(emptyList, { type: 'fetch-settle', token: 'quiet-share', itemCount: 0 });
    assert.equal(giverListPaint(emptyList), 'empty');
  });

  it('People invalidates a stale empty catalog before opening the typed /g/[token] href', () => {
    const token = 'family-share';
    const mug = getDemoItem('demo-mug')!;
    const gen = beginGiverCatalogWrite(token);
    writeGiverCatalog(token, [], gen);
    assert.equal(isGiverCatalogHydrated(token), true);
    assert.equal(peekGiverCatalog(token).length, 0);

    const pushed: ReturnType<typeof giverShareRoute>[] = [];
    const prefetched: string[] = [];
    openGiverShare(token, (href) => pushed.push(href), (next) => {
      prefetched.push(next);
    });
    assert.equal(isGiverCatalogHydrated(token), false);
    assert.equal(peekGiverCatalog(token).length, 0);
    assert.deepEqual(pushed, [{ pathname: '/g/[token]', params: { token } }]);
    assert.deepEqual(prefetched, [token]);

    writeGiverCatalog(token, [mug], beginGiverCatalogWrite(token));
    assert.equal(peekGiverCatalog(token).length, 1);
    invalidateGiverCatalog(token);
    // Non-empty rows stay — wiping them on every People tap is the #28 retry stuck-empty.
    assert.equal(isGiverCatalogHydrated(token), true);
    assert.equal(peekGiverCatalog(token).length, 1);
  });

  it('People prefetch paints items on first list mount before the screen fetch settles', () => {
    const token = 'family-share';
    const mug = getDemoItem('demo-mug')!;
    const pushed: ReturnType<typeof giverShareRoute>[] = [];
    openGiverShare(token, (href) => pushed.push(href), (next) => {
      writeGiverCatalog(next, [mug], beginGiverCatalogWrite(next));
    });
    assert.deepEqual(pushed[0], { pathname: '/g/[token]', params: { token } });
    assert.equal(peekGiverCatalog(token).length, 1);
    // List screen can still be loading / not fetchSettled; catalog already has rows.
    assert.equal(
      giverListPaint({
        token,
        loading: true,
        fetchSettled: false,
        itemCount: peekGiverCatalog(token).length,
      }),
      'grid',
    );
    assert.equal(
      wouldCommitLoadedEmpty({
        token,
        loading: true,
        fetchSettled: false,
        itemCount: peekGiverCatalog(token).length,
      }),
      false,
    );
  });

  it('#28 prefetch writeGen must not drop RPC rows when provider/focus bump gen', () => {
    const token = 'family-share';
    const mug = getDemoItem('demo-mug')!;
    const socks = getDemoItem('demo-socks')!;

    // People tap: invalidate empty, then getSharedItems() used to bump writeGen.
    openGiverShare(token, () => {}, (next) => {
      const prefetchGen = beginGiverCatalogWrite(next);
      const providerGen = beginGiverCatalogWrite(next);
      const focusGen = beginGiverCatalogWrite(next);
      // Prefetch RPC returns rows after the list already took a newer gen.
      writeGiverCatalog(next, [mug], prefetchGen);
      assert.equal(peekGiverCatalog(next).length, 1);
      assert.equal(
        giverListPaint({
          token: next,
          loading: false,
          fetchSettled: true,
          settledToken: next,
          itemCount: peekGiverCatalog(next).length,
        }),
        'grid',
      );
      writeGiverCatalog(next, [mug, socks], focusGen);
      assert.equal(peekGiverCatalog(next).length, 2);
      writeGiverCatalog(next, [], providerGen);
      assert.equal(peekGiverCatalog(next).length, 2);
    });

    assert.equal(giverPaintItems(peekGiverCatalog(token), []).length, 2);
    assert.equal(giverPaintItems([], [mug]).length, 1);
  });

  it('failed RPC does not count as a settled quiet list', () => {
    assert.equal(
      wouldCommitLoadedEmpty({
        token: 'family-share',
        loading: false,
        fetchSettled: false,
        itemCount: 0,
      }),
      false,
    );
    assert.equal(
      giverListPaint({
        token: 'family-share',
        loading: false,
        fetchSettled: false,
        itemCount: 0,
      }),
      'skeleton',
    );
    assert.equal(
      giverListPaint({
        token: 'family-share',
        loading: false,
        fetchSettled: true,
        settledToken: 'family-share',
        itemCount: 0,
        error: 'Failed to fetch',
      }),
      'skeleton',
    );
    assert.equal(
      wouldCommitLoadedEmpty({
        token: 'family-share',
        loading: false,
        fetchSettled: true,
        settledToken: 'family-share',
        itemCount: 0,
        error: 'Network request failed',
      }),
      false,
    );
  });

  it('last opened People pin can reopen that share', () => {
    const token = 'family-share';
    const mug = getDemoItem('demo-mug')!;
    const first: ReturnType<typeof giverShareRoute>[] = [];
    openGiverShare(token, (href) => first.push(href), (next) => {
      writeGiverCatalog(next, [mug]);
    });
    assert.equal(lastGiverShareToken(), token);
    assert.deepEqual(first[0], { pathname: '/g/[token]', params: { token } });

    const again: ReturnType<typeof giverShareRoute>[] = [];
    const fallback: string[] = [];
    assert.equal(
      openLastGiverShare((href) => again.push(href), undefined, () => fallback.push('people')),
      true,
    );
    assert.deepEqual(again, [{ pathname: '/g/[token]', params: { token } }]);
    assert.deepEqual(fallback, []);
    assert.equal(
      giverListPaint({
        token,
        loading: true,
        fetchSettled: false,
        itemCount: peekGiverCatalog(token).length,
      }),
      'grid',
    );

    resetGiverCatalog();
    const nowhere: ReturnType<typeof giverShareRoute>[] = [];
    assert.equal(
      openLastGiverShare((href) => nowhere.push(href), undefined, () => fallback.push('people')),
      false,
    );
    assert.deepEqual(nowhere, []);
    assert.deepEqual(fallback, ['people']);
  });

  it('People and giver list screens wire the live path, not a string /g/${token} first-open', () => {
    const people = source('app/(app)/people.tsx');
    const share = source('app/(app)/share.tsx');
    const owner = source('app/(app)/wishlist.tsx');
    const list = source('app/g/[token]/index.tsx');
    const header = source('components/flow-header.tsx');
    const provider = source('context/giver-share-context.tsx');
    const wishlist = source('services/wishlist.ts');

    assert.match(people, /openGiverShare\(person\.share_token, router\.push, prefetchSharedItems\)/);
    assert.match(people, /openGiverShare\(hit\.share_token, router\.push, prefetchSharedItems\)/);
    assert.match(people, /Open wishlist/);
    assert.equal(/onGiverView/.test(people), false);
    assert.equal(/hrefFor=\{\(item\) => `\/item\//.test(people), false);
    assert.equal(/router\.push\(`\/g\/\$\{/.test(people), false);

    assert.match(share, /openGiverShare\(wishlist\?\.share_token, router\.push, prefetchSharedItems\)/);
    assert.match(share, /openGiverShare\(occasion\.share_token, router\.push, prefetchSharedItems\)/);
    assert.match(share, /Open giver view/);
    assert.equal(/onGiverView/.test(share), false);
    assert.equal(/onGiverView/.test(owner), false);
    assert.equal(/onYourList/.test(owner), false);

    assert.equal(/accessibilityLabel="Giver view"/.test(header), false);
    assert.equal(/onGiverView/.test(header), false);
    assert.equal(/accessibilityLabel="Your list"/.test(header), false);

    assert.match(list, /fetchSettled/);
    assert.match(list, /peekGiverCatalog\(token\)\.length > 0/);
    assert.match(list, /giverPaintItems/);
    assert.equal(/onGiverView/.test(list), false);
    assert.equal(/onYourList/.test(list), false);
    assert.match(list, /giverListTitle/);
    assert.match(list, /Try again/);
    assert.match(list, /silent/);
    assert.match(provider, /fetchSettled/);
    assert.match(provider, /Stay loading/);
    assert.match(provider, /getSharedWishlist\(token\)/);
    assert.match(provider, /getSharedItems\(token, \{ writeGen \}\)/);
    assert.match(provider, /AppState\.addEventListener/);
    assert.match(provider, /peekGiverCatalog\(token\)\.length === 0/);
    assert.equal(/setTimeout\(/.test(provider), false);
    assert.equal(/setLoading\(false\);\s*return;/.test(provider.split('if (!token)')[1] ?? ''), false);

    assert.match(wishlist, /prefetch\?: boolean/);
    assert.match(wishlist, /prefetchSharedItems/);
    assert.match(wishlist, /listSharedPledges\(token\)\.catch/);
    assert.match(wishlist, /listSharedNotices\(token\)\.catch/);
    assert.match(wishlist, /shareRpcRows/);
  });
});
