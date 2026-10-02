import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { PrettyCopy } from './copy';
import { getDemoItem, markDemoItemFunded, resetDemoStore, simulateDemoFunded } from './demo-store';
import { giverItemChipLabel, giverStatusHint } from './format';
import { giverStatusActions, giverStatusChip } from './giver-status';
import {
  fundedProgressNote,
  groupGiftHeadline,
  groupGiftPhase,
  isFunded,
  isRevealedToOwner,
  pledgeRemaining,
  pledgeTotal,
} from './pledges';
import { ownerPayloadLeaksGiftProgress, ownerSafeItem } from './surprise-safe';
import type { WishlistItem } from './types';

function pledge(itemId: string, amount: number, id = 'p') {
  return {
    id,
    item_id: itemId,
    amount,
    display_name: null,
    created_at: '2026-09-01T00:00:00.000Z',
  };
}

describe('Ready to buy follows the pledge bar', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('underfunded group gift with funded_at and an arrived reveal stays Collecting', () => {
    const espresso = getDemoItem('demo-espresso')!;
    const short: WishlistItem = {
      ...espresso,
      target_amount: 189.99,
      funded_at: '2026-09-01T00:00:00.000Z',
      reveal_at: '2000-01-01',
      organiser_name: 'Wade',
      status: 'available',
      pledges: [pledge(espresso.id, 100)],
      notices: [
        {
          id: 'n',
          item_id: espresso.id,
          kind: 'ready_to_buy',
          title: 'Funded — time to buy',
          body: 'stale',
          email_preview: 'Subject: Funded — time to buy',
          created_at: '2026-09-01T00:00:00.000Z',
        },
      ],
    };

    assert.equal(pledgeTotal(short), 100);
    assert.equal(pledgeRemaining(short), 89.99);
    assert.equal(isFunded(short), false);
    assert.equal(groupGiftPhase(short), 'collecting');
    assert.equal(groupGiftHeadline(short), 'Collecting');
    assert.equal(giverItemChipLabel(short), 'Available · Collecting');
    assert.equal(giverStatusChip(short).tone, 'accent');
    assert.equal(giverStatusHint(short), PrettyCopy.claimHint);
    assert.equal(giverStatusActions(short).lockLabel, PrettyCopy.claimCta);
    assert.equal(fundedProgressNote(short), null);
    assert.equal(isRevealedToOwner(short), true);
    const owner = ownerSafeItem(short);
    assert.equal(owner.reveal?.from_group, true);
    assert.equal(owner.funded_at, null);
    assert.equal(owner.pledges, undefined);
    assert.equal(JSON.stringify(owner).includes('Ready to buy'), false);
    assert.equal(JSON.stringify(owner).includes('"amount"'), false);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);
  });

  it('solo available gift does not show Ready to buy when funded_at is set', () => {
    const mug = getDemoItem('demo-mug')!;
    const solo: WishlistItem = {
      ...mug,
      title: 'Whiskey Glass - Norlan',
      is_group_gift: false,
      status: 'available',
      funded_at: '2026-09-01T00:00:00.000Z',
      target_amount: 189.99,
      reveal_at: null,
      pledges: [],
    };

    assert.equal(isFunded(solo), false);
    assert.equal(groupGiftPhase(solo), null);
    assert.equal(giverStatusChip(solo).label, 'Available');
    assert.equal(giverStatusChip(solo).tone, 'muted');
    assert.equal(giverStatusHint(solo), PrettyCopy.claimHint);
    assert.equal(giverStatusActions(solo).lockLabel, PrettyCopy.claimCta);
    assert.equal(groupGiftHeadline(solo), null);
    assert.equal(fundedProgressNote(solo), null);
  });

  it('solo gift whose pledges already meet a target still stays Available until it is a group gift', () => {
    const mug = getDemoItem('demo-mug')!;
    const solo: WishlistItem = {
      ...mug,
      is_group_gift: false,
      status: 'available',
      funded_at: '2026-09-01T00:00:00.000Z',
      target_amount: 40,
      pledges: [pledge(mug.id, 40)],
    };
    assert.equal(isFunded(solo), true);
    assert.equal(groupGiftPhase(solo), null);
    assert.equal(giverItemChipLabel(solo), 'Available');
    assert.equal(giverStatusChip(solo).tone, 'muted');
  });

  it('ready to buy starts when pledge cents meet the target, not when the reveal date arrives', () => {
    const espresso = getDemoItem('demo-espresso')!;
    const revealedShort: WishlistItem = {
      ...espresso,
      funded_at: null,
      reveal_at: '2020-01-01',
      status: 'available',
    };
    assert.equal(isRevealedToOwner(revealedShort, new Date(2026, 9, 2)), true);
    assert.equal(groupGiftPhase(revealedShort), 'collecting');
    assert.equal(giverItemChipLabel(revealedShort), 'Available · Collecting');

    const met: WishlistItem = {
      ...espresso,
      funded_at: null,
      reveal_at: espresso.reveal_at,
      target_amount: 189.99,
      pledges: [pledge(espresso.id, 100, 'a'), pledge(espresso.id, 89.99, 'b')],
    };
    assert.equal(pledgeRemaining(met), 0);
    assert.equal(isFunded(met), true);
    assert.equal(groupGiftPhase(met), 'ready_to_buy');
    assert.equal(giverItemChipLabel(met), 'Ready to buy');
    assert.equal(giverStatusChip(met).tone, 'brand');
    assert.equal(groupGiftHeadline(met), 'Ready to buy — organiser should purchase');
    assert.equal(giverStatusHint(met), PrettyCopy.readyToBuyHint);
    assert.match(fundedProgressNote(met) ?? '', /Funded among givers/);
    assert.equal((fundedProgressNote(met) ?? '').includes('has arrived'), false);
    assert.equal(isRevealedToOwner(met), false);
    assert.equal(ownerSafeItem(met).reveal, undefined);
  });

  it('one cent short stays collecting even with funded_at, and cent totals do not drift', () => {
    const espresso = getDemoItem('demo-espresso')!;
    const short: WishlistItem = {
      ...espresso,
      funded_at: '2026-09-01T00:00:00.000Z',
      target_amount: 20.3,
      pledges: [pledge(espresso.id, 10.1, 'a'), pledge(espresso.id, 10.19, 'b')],
    };
    assert.equal(isFunded(short), false);
    assert.equal(groupGiftPhase(short), 'collecting');
    assert.equal(pledgeRemaining(short), 0.01);

    const exact: WishlistItem = {
      ...short,
      pledges: [pledge(espresso.id, 10.1, 'a'), pledge(espresso.id, 10.2, 'b')],
    };
    assert.equal(isFunded(exact), true);
    assert.equal(groupGiftPhase(exact), 'ready_to_buy');
  });

  it('a group gift with no target still uses the honour funded_at stamp', () => {
    const espresso = getDemoItem('demo-espresso')!;
    const open: WishlistItem = {
      ...espresso,
      target_amount: null,
      funded_at: null,
      pledges: [pledge(espresso.id, 40)],
    };
    assert.equal(isFunded(open), false);
    assert.equal(groupGiftPhase(open), 'collecting');

    const marked: WishlistItem = { ...open, funded_at: '2026-09-01T00:00:00.000Z' };
    assert.equal(isFunded(marked), true);
    assert.equal(groupGiftPhase(marked), 'ready_to_buy');
    assert.equal(giverItemChipLabel(marked), 'Ready to buy');
  });

  it('mark funded does not stamp a short target; simulate still tops up to ready to buy', () => {
    const before = getDemoItem('demo-espresso')!;
    assert.ok((pledgeRemaining(before) ?? 0) > 0);
    const ignored = markDemoItemFunded('demo-espresso');
    assert.equal(ignored.funded_at, null);
    assert.equal(groupGiftPhase(ignored), 'collecting');
    assert.equal(giverItemChipLabel(ignored), 'Available · Collecting');
    assert.equal(ignored.notices?.some((row) => row.kind === 'ready_to_buy'), false);

    const funded = simulateDemoFunded('demo-espresso');
    assert.equal(isFunded(funded), true);
    assert.ok(pledgeTotal(funded) >= (funded.target_amount ?? 0));
    assert.equal(groupGiftPhase(funded), 'ready_to_buy');
    assert.equal(isRevealedToOwner(funded), false);
    assert.equal(ownerSafeItem(funded).reveal, undefined);
    assert.equal(ownerPayloadLeaksGiftProgress(ownerSafeItem(funded)), null);
  });
});
