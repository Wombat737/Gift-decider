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
import { patchGiverCatalog, peekGiverCatalog, pickSharedItem, shareTokenParam, writeGiverCatalog } from './giver-catalog';
import {
  applyItemStatus,
  coerceItemStatus,
  giverStatusChip,
  mergeGiverItem,
  replaceSharedItem,
} from './giver-status';
import { ownerSafeItem } from './surprise-safe';

describe('Giver status icon after lock / purchase / release', () => {
  beforeEach(() => {
    resetDemoStore();
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
    assert.equal(giverStatusChip(bought).tone, 'brand');
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
});
