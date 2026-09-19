import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { beforeEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { getDemoItem, resetDemoStore } from './demo-store';
import {
  beginGiverCatalogWrite,
  giverListPaint,
  giverShareRoute,
  invalidateGiverCatalog,
  isGiverCatalogHydrated,
  openGiverShare,
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
    assert.equal(isGiverCatalogHydrated(token), false);
    assert.equal(peekGiverCatalog(token).length, 0);
  });

  it('People and giver list screens wire the live path, not a string /g/${token} first-open', () => {
    const people = source('app/(app)/people.tsx');
    const list = source('app/g/[token]/index.tsx');
    const provider = source('context/giver-share-context.tsx');

    assert.match(people, /openGiverShare/);
    assert.match(people, /getSharedItems/);
    assert.match(people, /Open wishlist/);
    assert.equal(/router\.push\(`\/g\/\$\{/.test(people), false);

    assert.match(list, /fetchSettled/);
    assert.match(list, /peekGiverCatalog\(token\)\.length > 0/);
    assert.match(list, /silent/);
    assert.match(provider, /fetchSettled/);
    assert.match(provider, /Stay loading/);
    assert.equal(/setTimeout\(/.test(provider), false);
    assert.equal(/setLoading\(false\);\s*return;/.test(provider.split('if (!token)')[1] ?? ''), false);
  });
});
