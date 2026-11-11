import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { getDemoItem, resetDemoStore } from './demo-store';
import { formatAudQuiet } from './format';
import {
  applyGiverListView,
  giverClaimBadge,
  giverItemUnavailable,
  giverListControlsVisible,
  giverPriceLabel,
  groupGiftCardProgress,
  presentGiverList,
  sortGiverItems,
} from './giver-list';
import { ownerPreviewItem } from './owner-preview';
import type { WishlistItem } from './types';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

function demo(id: string) {
  const item = getDemoItem(id);
  assert.ok(item, id);
  return item;
}

describe('giver list price, sort, and available filter', () => {
  it('formats a quiet price and stays silent when there is no amount', () => {
    resetDemoStore();
    assert.equal(formatAudQuiet(42), '$42');
    assert.equal(formatAudQuiet(429), '$429');
    assert.equal(formatAudQuiet(42.5), '$42.50');
    assert.equal(formatAudQuiet(20.3), '$20.30');
    assert.equal(giverPriceLabel(demo('demo-mug')), '$42');
    assert.equal(giverPriceLabel(demo('demo-espresso')), '$429 goal');
    assert.equal(giverPriceLabel(demo('demo-socks')), null);
    assert.equal(giverPriceLabel({ target_amount: 0, is_group_gift: true }), null);
    assert.equal(giverPriceLabel({ target_amount: Number.NaN, is_group_gift: false }), null);
    assert.equal(giverPriceLabel({ target_amount: -5, is_group_gift: false }), null);
    assert.equal(giverPriceLabel({ target_amount: 80, is_group_gift: true }), '$80 goal');
    assert.equal(giverPriceLabel({ target_amount: 42.5, is_group_gift: false }), '$42.50');
  });

  it('sorts by price with unpriced items last and keeps ties stable', () => {
    resetDemoStore();
    const items = [
      demo('demo-throw'),
      demo('demo-espresso'),
      demo('demo-mug'),
      { ...demo('demo-book'), id: 'same-price', target_amount: 42 },
      demo('demo-socks'),
      demo('demo-grinder'),
    ];
    assert.deepEqual(
      sortGiverItems(items, 'recommended').map((item) => item.id),
      items.map((item) => item.id),
    );
    assert.deepEqual(
      sortGiverItems(items, 'price-asc').map((item) => item.id),
      ['demo-mug', 'same-price', 'demo-grinder', 'demo-espresso', 'demo-throw', 'demo-socks'],
    );
    assert.deepEqual(
      sortGiverItems(items, 'price-desc').map((item) => item.id),
      ['demo-espresso', 'demo-grinder', 'demo-mug', 'same-price', 'demo-throw', 'demo-socks'],
    );
  });

  it('hides reserved, bought, and funded group gifts, and composes with search order', () => {
    resetDemoStore();
    const funded: WishlistItem = {
      ...demo('demo-espresso'),
      id: 'funded-open',
      status: 'available',
      target_amount: 100,
      pledges: [
        {
          id: 'pledge-funded',
          item_id: 'funded-open',
          amount: 100,
          display_name: 'Alex',
          created_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    };
    const searching = [demo('demo-socks'), funded, demo('demo-mug'), demo('demo-plant'), demo('demo-throw')];
    assert.equal(giverItemUnavailable(funded), true);
    assert.equal(giverItemUnavailable(demo('demo-socks')), true);
    assert.equal(giverItemUnavailable(demo('demo-plant')), true);
    assert.equal(giverItemUnavailable(demo('demo-grinder')), true);
    assert.equal(giverItemUnavailable(demo('demo-espresso')), false);
    assert.equal(giverItemUnavailable(demo('demo-mug')), false);

    const visible = applyGiverListView(searching, { sort: 'price-asc', availableOnly: true });
    assert.deepEqual(
      visible.map((item) => item.id),
      ['demo-mug', 'demo-throw'],
    );
    assert.deepEqual(
      presentGiverList(searching, { sort: 'price-asc', availableOnly: true }, 7).map((item) => item.id),
      ['demo-mug', 'demo-throw'],
    );
    assert.deepEqual(
      presentGiverList(searching, { sort: 'price-asc', availableOnly: true }, searching.length).map((item) => item.id),
      searching.map((item) => item.id),
    );
  });

  it('leaves short lists unsorted even if a session toggle is still set', () => {
    resetDemoStore();
    const short = [demo('demo-espresso'), demo('demo-mug'), demo('demo-socks')];
    assert.equal(giverListControlsVisible(5), false);
    assert.equal(giverListControlsVisible(6), true);
    assert.deepEqual(
      presentGiverList(short, { sort: 'price-asc', availableOnly: true }, 5).map((item) => item.id),
      ['demo-espresso', 'demo-mug', 'demo-socks'],
    );
  });

  it('keeps claim chrome off the owner preview while the price stays', () => {
    resetDemoStore();
    const socks = ownerPreviewItem(demo('demo-socks'));
    const espresso = ownerPreviewItem(demo('demo-espresso'));
    assert.equal(giverClaimBadge(demo('demo-socks')), 'Reserved');
    assert.equal(giverClaimBadge(demo('demo-plant')), 'Bought');
    assert.equal(giverClaimBadge(demo('demo-mug')), null);
    assert.equal(giverClaimBadge(socks), null);
    assert.equal(giverItemUnavailable(socks), false);
    assert.equal(giverPriceLabel(socks), null);
    assert.equal(giverPriceLabel(espresso), '$429');
    assert.equal(giverPriceLabel(espresso)?.includes('goal'), false);
    assert.equal(groupGiftCardProgress(espresso), null);

    const partial = groupGiftCardProgress(demo('demo-espresso'));
    assert.equal(partial?.label, '$130 of $429');
    assert.ok(partial && partial.ratio > 0 && partial.ratio < 1);
    const quiet = {
      ...demo('demo-espresso'),
      pledges: [],
    };
    assert.equal(groupGiftCardProgress(quiet)?.label, '$0 of $429');
    assert.equal(groupGiftCardProgress(quiet)?.ratio, 0);
    const ready = groupGiftCardProgress({
      ...demo('demo-espresso'),
      target_amount: 100,
      status: 'available',
      pledges: [
        {
          id: 'full',
          item_id: 'demo-espresso',
          amount: 100,
          display_name: null,
          created_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
    assert.equal(ready?.ratio, 1);
    assert.equal(ready?.label, '$100 of $100 · Ready to buy');
    const bought = groupGiftCardProgress(demo('demo-grinder'));
    assert.equal(bought?.ratio, 1);
    assert.equal(bought?.label, '$249 of $249');
    assert.equal(bought?.label.includes('Ready to buy'), false);
    const cents = groupGiftCardProgress({
      ...demo('demo-espresso'),
      target_amount: 40,
      pledges: [
        {
          id: 'cents',
          item_id: 'demo-espresso',
          amount: 20.5,
          display_name: null,
          created_at: '2026-01-02T00:00:00.000Z',
        },
      ],
    });
    assert.equal(cents?.label, '$20.50 of $40');

    const card = source('components/stage-giver-card.tsx');
    assert.match(card, /readOnly \? null : giverClaimBadge/);
    assert.match(card, /giverPriceLabel/);
    assert.match(card, /opacity: 0\.55/);
    assert.match(card, /readOnly \? null : groupGiftCardProgress/);
    assert.match(card, /gap: Spacing\.three/);
    const thumb = source('components/stage-thumb.tsx');
    assert.equal(thumb.includes('brandSoft'), false);
    assert.equal(thumb.includes('brandInk'), false);
    assert.match(source('components/item-fields.tsx'), /Price \(AUD, optional\)/);
    assert.match(source('components/item-fields.tsx'), /share the cost/);
    assert.match(source('app/g/[token]/index.tsx'), /presentGiverList/);
    assert.match(source('app/g/[token]/index.tsx'), /GiverListControls/);
    const controls = source('components/giver-list-controls.tsx');
    assert.match(controls, /Sort · /);
    assert.match(controls, /Available only/);
    assert.match(controls, /flexWrap: 'nowrap'/);
    assert.match(source('app/(app)/item/[id].tsx'), /formatAudQuiet/);
    assert.match(source('app/g/[token]/[itemId].tsx'), /giverPriceLabel/);
  });
});
