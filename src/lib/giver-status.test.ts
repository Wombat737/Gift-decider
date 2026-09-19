import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  getDemoItem,
  getDemoStoreVersion,
  listDemoSharedItems,
  resetDemoStore,
  setDemoItemStatus,
  subscribeDemoStore,
} from './demo-store';
import {
  beginGiverCatalogWrite,
  giverListPaint,
  isGiverCatalogHydrated,
  patchGiverCatalog,
  peekGiverCatalog,
  pickSharedItem,
  resetGiverCatalog,
  shareTokenFromPathname,
  shareTokenFromRoute,
  shareTokenParam,
  writeGiverCatalog,
} from './giver-catalog';
import {
  applyItemStatus,
  coerceItemStatus,
  giverStatusActions,
  giverStatusChip,
  mergeGiverItem,
  preferLocalGiverItem,
  replaceSharedItem,
} from './giver-status';
import { ownerSafeItem } from './surprise-safe';

describe('Giver status icon after lock / purchase / release', () => {
  beforeEach(() => {
    resetDemoStore();
    resetGiverCatalog();
  });

  it('list badge and item chip follow demo soft-lock, purchase, and release', () => {
    const list = listDemoSharedItems('demo');
    const mug = list.find((item) => item.id === 'demo-mug');
    assert.ok(mug);
    assert.equal(giverStatusChip(mug).label, 'Open');
    assert.equal(giverStatusChip(mug).tone, 'muted');

    const taken = setDemoItemStatus('demo-mug', 'reserved', 'Alex');
    assert.equal(taken.status, 'reserved');
    assert.equal(giverStatusChip(taken).label, 'Taken');
    assert.equal(giverStatusChip(taken).tone, 'reserved');

    const afterLock = replaceSharedItem(list, taken);
    const listMug = afterLock.find((item) => item.id === 'demo-mug');
    assert.ok(listMug);
    assert.equal(giverStatusChip(listMug).label, 'Taken');
    assert.equal(giverStatusChip(listMug).tone, 'reserved');

    const bought = setDemoItemStatus('demo-mug', 'purchased', 'Alex');
    const afterBuy = replaceSharedItem(afterLock, bought);
    assert.equal(giverStatusChip(bought).label, 'Bought');
    assert.equal(giverStatusChip(bought).tone, 'success');
    assert.equal(giverStatusChip(afterBuy.find((item) => item.id === 'demo-mug')!).label, 'Bought');

    const released = setDemoItemStatus('demo-mug', 'available');
    const afterRelease = replaceSharedItem(afterBuy, released);
    assert.equal(giverStatusChip(released).label, 'Open');
    assert.equal(giverStatusChip(released).tone, 'muted');
    assert.equal(giverStatusChip(afterRelease.find((item) => item.id === 'demo-mug')!).label, 'Open');

    const collecting = getDemoItem('demo-espresso')!;
    assert.equal(giverStatusChip(collecting).label, 'Open · Collecting');
    const takenEspresso = setDemoItemStatus('demo-espresso', 'reserved', 'Alex');
    assert.equal(giverStatusChip(takenEspresso).label, 'Taken · Collecting');
    const boughtEspresso = setDemoItemStatus('demo-espresso', 'purchased', 'Alex');
    assert.equal(giverStatusChip(boughtEspresso).label, 'Bought');
  });

  it('giver list re-reads the demo store after lock / purchase / release without a local patch', () => {
    assert.equal(giverStatusChip(listDemoSharedItems('demo').find((item) => item.id === 'demo-mug')!).label, 'Open');

    let notified = 0;
    const stop = subscribeDemoStore(() => {
      notified += 1;
    });
    const versionBefore = getDemoStoreVersion();
    setDemoItemStatus('demo-mug', 'reserved', 'Alex');
    stop();

    assert.ok(notified >= 1);
    assert.ok(getDemoStoreVersion() > versionBefore);
    assert.equal(giverStatusChip(listDemoSharedItems('demo').find((item) => item.id === 'demo-mug')!).label, 'Taken');
    assert.equal(giverStatusChip(peekGiverCatalog('demo').find((item) => item.id === 'demo-mug')!).label, 'Taken');

    setDemoItemStatus('demo-mug', 'purchased', 'Alex');
    assert.equal(giverStatusChip(listDemoSharedItems('demo').find((item) => item.id === 'demo-mug')!).label, 'Bought');
    assert.equal(giverStatusChip(peekGiverCatalog('demo').find((item) => item.id === 'demo-mug')!).label, 'Bought');

    setDemoItemStatus('demo-mug', 'available');
    assert.equal(giverStatusChip(listDemoSharedItems('demo').find((item) => item.id === 'demo-mug')!).label, 'Open');
    assert.equal(giverStatusChip(peekGiverCatalog('demo').find((item) => item.id === 'demo-mug')!).label, 'Open');

    const housewarming = listDemoSharedItems('demo-housewarming');
    const book = housewarming.find((item) => item.id === 'demo-book');
    assert.ok(book);
    assert.equal(giverStatusChip(book).label, 'Open');
    setDemoItemStatus('demo-book', 'reserved', 'Jo');
    assert.equal(
      giverStatusChip(listDemoSharedItems('demo-housewarming').find((item) => item.id === 'demo-book')!).label,
      'Taken',
    );

    const owner = ownerSafeItem(getDemoItem('demo-mug')!);
    assert.equal(owner.status, 'available');
    assert.equal(JSON.stringify(owner).includes('Taken'), false);
  });

  it('seeded socks stay Taken on the giver list and look Open to the owner', () => {
    const socks = getDemoItem('demo-socks')!;
    assert.equal(giverStatusChip(socks).label, 'Taken');
    const owner = ownerSafeItem(socks);
    assert.equal(owner.status, 'available');
    assert.equal(giverStatusChip(owner).label, 'Open');
    assert.equal(giverStatusChip(owner).tone, 'muted');
    assert.equal(JSON.stringify(owner).includes('Taken'), false);
  });

  it('sparse live RPC rows still resolve to the requested lock or purchase', () => {
    const mug = getDemoItem('demo-mug')!;
    assert.equal(coerceItemStatus(undefined, 'reserved'), 'reserved');
    assert.equal(coerceItemStatus(null, 'purchased'), 'purchased');
    assert.equal(coerceItemStatus('reserved'), 'reserved');

    const stripped = { ...mug, status: undefined as unknown as typeof mug.status };
    const taken = applyItemStatus(stripped, coerceItemStatus(stripped.status, 'reserved'), 'Alex');
    assert.equal(giverStatusChip(taken).label, 'Taken');

    const bought = applyItemStatus(taken, coerceItemStatus(undefined, 'purchased'));
    assert.equal(giverStatusChip(bought).label, 'Bought');

    const owner = ownerSafeItem(bought);
    assert.equal(owner.status, 'available');
    assert.equal(JSON.stringify(owner).includes('Bought'), false);
    assert.equal(JSON.stringify(owner).includes('Taken'), false);
  });

  it('live share catalog and detail pick the same chip after lock / purchase / release', () => {
    const token = 'live-share-token';
    const mug = getDemoItem('demo-mug')!;
    writeGiverCatalog(token, [mug]);

    const listOpen = pickSharedItem('demo-mug', peekGiverCatalog(token));
    assert.ok(listOpen);
    assert.equal(giverStatusChip(listOpen).label, 'Open');

    const taken = applyItemStatus(mug, 'reserved', 'Alex');
    patchGiverCatalog(token, taken);
    const listTaken = pickSharedItem('demo-mug', peekGiverCatalog(token), [mug]);
    assert.ok(listTaken);
    assert.equal(giverStatusChip(listTaken).label, 'Taken');
    assert.equal(listTaken.status, 'reserved');

    patchGiverCatalog(token, applyItemStatus(taken, 'purchased', 'Alex'));
    assert.equal(giverStatusChip(pickSharedItem('demo-mug', peekGiverCatalog(token))!).label, 'Bought');

    patchGiverCatalog(token, applyItemStatus(taken, 'available'));
    assert.equal(giverStatusChip(pickSharedItem('demo-mug', peekGiverCatalog(token))!).label, 'Open');

    assert.equal(shareTokenParam(['demo-mug']), 'demo-mug');
    assert.equal(pickSharedItem(shareTokenParam(['demo-mug']), peekGiverCatalog(token))?.id, 'demo-mug');

    const owner = ownerSafeItem(pickSharedItem('demo-mug', peekGiverCatalog(token))!);
    assert.equal(owner.status, 'available');
    assert.equal(JSON.stringify(owner).includes('Taken'), false);
  });

  it('stale reserved list fetch after purchase does not roll Bought back to Taken', () => {
    const mug = getDemoItem('demo-mug')!;
    const locked = applyItemStatus(mug, 'reserved', 'Alex');
    const bought = applyItemStatus(locked, 'purchased', 'Alex');
    const staleReserved = { ...locked, status: 'reserved' as const };

    const merged = mergeGiverItem(staleReserved, bought);
    assert.equal(giverStatusChip(merged).label, 'Bought');
    assert.equal(merged.status, 'purchased');

    writeGiverCatalog('live-share-stale', [bought]);
    writeGiverCatalog('live-share-stale', [staleReserved]);
    assert.equal(giverStatusChip(peekGiverCatalog('live-share-stale')[0]).label, 'Bought');

    const released = mergeGiverItem(applyItemStatus(bought, 'available'), bought);
    assert.equal(giverStatusChip(released).label, 'Open');
    assert.equal(released.status, 'available');
    assert.equal(released.reserved_at, null);

    const owner = ownerSafeItem(merged);
    assert.equal(owner.status, 'available');
    assert.equal(JSON.stringify(owner).includes('Bought'), false);
  });

  it('sparse live RPC row that looks available still keeps Taken/Bought', () => {
    const mug = getDemoItem('demo-mug')!;
    const bought = applyItemStatus(mug, 'purchased', 'Alex');
    const stripped = {
      ...bought,
      status: 'available' as const,
      reserved_by: bought.reserved_by,
      reserved_at: bought.reserved_at,
    };
    const merged = mergeGiverItem(stripped, bought);
    assert.equal(giverStatusChip(merged).label, 'Bought');
    assert.equal(merged.status, 'purchased');
    assert.equal(ownerSafeItem(merged).status, 'available');
  });

  it('demo and live list keep Bought after a stale Taken focus refresh', () => {
    const taken = setDemoItemStatus('demo-mug', 'reserved', 'Alex');
    const bought = applyItemStatus(taken, 'purchased', 'Alex');
    patchGiverCatalog('demo', bought);
    writeGiverCatalog('demo', [taken, ...listDemoSharedItems('demo').filter((item) => item.id !== 'demo-mug')]);
    assert.equal(giverStatusChip(peekGiverCatalog('demo').find((item) => item.id === 'demo-mug')!).label, 'Bought');

    writeGiverCatalog('live-share-back', [bought]);
    patchGiverCatalog('live-share-back', bought);
    writeGiverCatalog('live-share-back', [taken]);
    assert.equal(giverStatusChip(peekGiverCatalog('live-share-back')[0]).label, 'Bought');

    const released = setDemoItemStatus('demo-mug', 'available');
    patchGiverCatalog('demo', released);
    assert.equal(giverStatusChip(peekGiverCatalog('demo').find((item) => item.id === 'demo-mug')!).label, 'Open');
  });

  it('item screen paints Taken/Bought/Open immediately while the catalog is still stale', () => {
    const mug = getDemoItem('demo-mug')!;
    const liveToken = 'live-share-item-screen';
    writeGiverCatalog(liveToken, [mug]);

    let local: typeof mug | null = mug;
    const paint = () => preferLocalGiverItem(pickSharedItem('demo-mug', peekGiverCatalog(liveToken)), local);

    const open = paint();
    assert.ok(open);
    assert.equal(giverStatusChip(open).label, 'Open');
    assert.equal(giverStatusActions(open).lockLabel, 'Soft-lock this');
    assert.equal(giverStatusActions(open).purchaseLabel, 'Mark purchased');
    assert.equal(giverStatusActions(open).releaseLabel, 'Not on hold');

    local = applyItemStatus(open, 'reserved', 'Alex');
    const taken = paint();
    assert.ok(taken);
    assert.equal(taken.status, 'reserved');
    assert.equal(giverStatusChip(taken).label, 'Taken');
    assert.equal(giverStatusActions(taken).lockLabel, 'Already taken — steal the lock?');
    assert.equal(giverStatusActions(taken).purchaseLabel, 'Mark purchased');
    assert.equal(giverStatusActions(taken).releaseLabel, 'Release hold');
    assert.equal(giverStatusActions(taken, true).lockLabel, 'Saving…');
    // Catalog not patched yet — the old `shareItem ?? item` paint would stay Open.
    assert.equal(giverStatusChip((pickSharedItem('demo-mug', peekGiverCatalog(liveToken)) ?? local)!).label, 'Open');
    assert.equal(giverStatusChip(preferLocalGiverItem(pickSharedItem('demo-mug', peekGiverCatalog(liveToken)), local)!).label, 'Taken');

    patchGiverCatalog(liveToken, local);
    assert.equal(giverStatusChip(pickSharedItem('demo-mug', peekGiverCatalog(liveToken))!).label, 'Taken');
    assert.equal(giverStatusChip(paint()!).label, 'Taken');

    local = applyItemStatus(taken, 'purchased', 'Alex');
    const bought = paint();
    assert.ok(bought);
    assert.equal(giverStatusChip(bought).label, 'Bought');
    assert.equal(giverStatusActions(bought).purchaseLabel, 'Already purchased');
    assert.equal(giverStatusActions(bought).lockLabel, 'Soft-lock this');
    assert.equal(giverStatusActions(bought).releaseLabel, 'Release hold');
    patchGiverCatalog(liveToken, local);
    assert.equal(giverStatusChip(pickSharedItem('demo-mug', peekGiverCatalog(liveToken))!).label, 'Bought');

    local = applyItemStatus(bought, 'available');
    const released = paint();
    assert.ok(released);
    assert.equal(released.status, 'available');
    assert.equal(giverStatusChip(released).label, 'Open');
    assert.equal(giverStatusActions(released).releaseLabel, 'Not on hold');
    assert.equal(giverStatusActions(released).lockLabel, 'Soft-lock this');
    patchGiverCatalog(liveToken, local);
    assert.equal(giverStatusChip(pickSharedItem('demo-mug', peekGiverCatalog(liveToken))!).label, 'Open');

    const socks = getDemoItem('demo-socks')!;
    assert.equal(preferLocalGiverItem(socks, local)?.id, 'demo-socks');
    assert.equal(ownerSafeItem(bought).status, 'available');
    assert.equal(JSON.stringify(ownerSafeItem(bought)).includes('Bought'), false);
  });

  it('demo overlay write-through keeps Taken while the demo store is still Open', () => {
    const mug = getDemoItem('demo-mug')!;
    assert.equal(giverStatusChip(mug).label, 'Open');
    patchGiverCatalog('demo', applyItemStatus(mug, 'reserved', 'Alex'));
    assert.equal(giverStatusChip(peekGiverCatalog('demo').find((item) => item.id === 'demo-mug')!).label, 'Taken');
    assert.equal(giverStatusChip(listDemoSharedItems('demo').find((item) => item.id === 'demo-mug')!).label, 'Open');
    patchGiverCatalog('demo', applyItemStatus(mug, 'purchased', 'Alex'));
    assert.equal(giverStatusChip(peekGiverCatalog('demo').find((item) => item.id === 'demo-mug')!).label, 'Bought');
    const owner = ownerSafeItem(peekGiverCatalog('demo').find((item) => item.id === 'demo-mug')!);
    assert.equal(owner.status, 'available');
  });

  it('first giver-list paint stays skeleton until the fetch settles', () => {
    assert.equal(
      giverListPaint({ token: undefined, loading: true, fetchSettled: false, itemCount: 0 }),
      'skeleton',
    );
    assert.equal(
      giverListPaint({ token: 'live-share', loading: true, fetchSettled: false, itemCount: 0 }),
      'skeleton',
    );
    assert.equal(
      giverListPaint({ token: 'live-share', loading: false, fetchSettled: false, itemCount: 0 }),
      'skeleton',
    );
    assert.equal(
      giverListPaint({ token: 'live-share', loading: false, fetchSettled: true, settledToken: 'live-share', itemCount: 0 }),
      'empty',
    );
    assert.equal(
      giverListPaint({ token: 'live-share', loading: true, fetchSettled: false, itemCount: 1 }),
      'grid',
    );
    assert.equal(
      giverListPaint({
        token: 'live-share',
        loading: false,
        fetchSettled: true,
        settledToken: 'live-share',
        itemCount: 0,
        query: 'linen',
      }),
      'empty',
    );
    assert.equal(
      giverListPaint({ token: undefined, loading: false, fetchSettled: false, itemCount: 0 }),
      'skeleton',
    );
  });

  it('live catalog is not hydrated until a write; stale writes cannot empty it', () => {
    const token = 'live-first-open';
    assert.equal(isGiverCatalogHydrated(token), false);
    assert.equal(peekGiverCatalog(token).length, 0);
    assert.equal(isGiverCatalogHydrated('demo'), true);

    const mug = getDemoItem('demo-mug')!;
    const first = beginGiverCatalogWrite(token);
    const second = beginGiverCatalogWrite(token);
    writeGiverCatalog(token, [], first);
    assert.equal(isGiverCatalogHydrated(token), false);
    assert.equal(peekGiverCatalog(token).length, 0);

    writeGiverCatalog(token, [mug], second);
    assert.equal(isGiverCatalogHydrated(token), true);
    assert.equal(peekGiverCatalog(token).length, 1);

    const lateEmpty = first;
    writeGiverCatalog(token, [], lateEmpty);
    assert.equal(peekGiverCatalog(token).length, 1);

    const third = beginGiverCatalogWrite(token);
    writeGiverCatalog(token, [], third);
    assert.equal(isGiverCatalogHydrated(token), true);
    assert.equal(peekGiverCatalog(token).length, 0);
  });

  it('share token resolves from /g/:token even when layout params are still empty', () => {
    assert.equal(shareTokenFromPathname('/g/abc-token'), 'abc-token');
    assert.equal(shareTokenFromPathname('/Gift-decider/g/abc-token/item-1'), 'abc-token');
    assert.equal(shareTokenFromPathname('/people'), undefined);
    assert.equal(
      shareTokenFromRoute({ local: undefined, global: undefined, pathname: '/g/family-share' }),
      'family-share',
    );
    assert.equal(
      shareTokenFromRoute({ local: ['live-local'], global: 'ignored', pathname: '/g/path' }),
      'live-local',
    );
    assert.equal(
      shareTokenFromRoute({ local: undefined, global: undefined, pathname: '/g/[token]' }),
      undefined,
    );
  });
});
