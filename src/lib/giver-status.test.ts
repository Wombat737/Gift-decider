import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  getDemoItem,
  listDemoSharedItems,
  resetDemoStore,
  setDemoItemStatus,
} from './demo-store';
import {
  applyItemStatus,
  coerceItemStatus,
  giverStatusChip,
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
});
