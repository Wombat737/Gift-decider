import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  getDemoItem,
  listDemoItems,
  resetDemoStore,
  simulateDemoFunded,
  simulateDemoReveal,
} from './demo-store';
import { inspectBuyLink } from './link-health';
import {
  formatContributorList,
  isFunded,
  isRevealedToOwner,
  localDateISO,
  pledgeTotal,
  shiftLocalDate,
} from './pledges';
import { ownerPayloadLeaksGiftProgress, ownerSafeItem } from './surprise-safe';
import { suggestSubstitutes } from './substitutes';

describe('Phase 3 demo walkthrough — surprise-safe', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('owner espresso stays unspoiled until the reveal date — funded is not enough', () => {
    const giver = getDemoItem('demo-espresso');
    assert.ok(giver);
    assert.equal(giver.is_group_gift, true);
    assert.equal(isFunded(giver), false);
    assert.ok(giver.reveal_at && giver.reveal_at > localDateISO());
    assert.ok(pledgeTotal(giver) > 0);
    assert.ok(giver.pledges && giver.pledges.length >= 2);

    const owner = ownerSafeItem(giver);
    assert.equal(owner.status, 'available');
    assert.equal(owner.reserved_by, null);
    assert.equal(owner.is_group_gift, false);
    assert.equal(owner.buy_url_dead, false);
    assert.equal(owner.pledges, undefined);
    assert.equal(owner.reveal, undefined);
    assert.equal(owner.funded_at, null);
    assert.equal(owner.reveal_at, null);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);

    const funded = simulateDemoFunded('demo-espresso');
    assert.equal(isFunded(funded), true);
    assert.ok(pledgeTotal(funded) >= (funded.target_amount ?? 0));
    assert.equal(isRevealedToOwner(funded), false);

    const stillHidden = ownerSafeItem(funded);
    assert.equal(stillHidden.reveal, undefined);
    assert.equal(stillHidden.funded_at, null);
    assert.equal(stillHidden.is_group_gift, false);
    assert.equal(ownerPayloadLeaksGiftProgress(stillHidden), null);
  });

  it('givers keep pledge progress and names before funded and before reveal', () => {
    const giver = getDemoItem('demo-espresso');
    assert.ok(giver);
    const alex = giver.pledges?.find((row) => row.display_name === 'Alex');
    assert.ok(alex);
    assert.equal(alex.amount, 80);
    assert.ok(giver.pledges?.some((row) => row.display_name == null));
    assert.equal(giver.is_group_gift, true);
    assert.ok(giver.reveal_at);
  });

  it('after simulate reveal yesterday, owner sees who it is from — names only', () => {
    const funded = simulateDemoFunded('demo-espresso');
    assert.equal(isFunded(funded), true);
    assert.equal(ownerSafeItem(funded).reveal, undefined);

    const revealed = simulateDemoReveal('demo-espresso', 'yesterday');
    assert.equal(revealed.reveal_at, shiftLocalDate(-1));
    assert.equal(isRevealedToOwner(revealed), true);

    const owner = ownerSafeItem(revealed);
    assert.ok(owner.reveal);
    assert.equal(owner.reveal.from_group, true);
    assert.ok(owner.reveal.contributors.includes('Alex'));
    assert.ok(owner.reveal.contributors.includes('Anonymous'));
    assert.equal(owner.pledges, undefined);
    assert.equal(owner.status, 'available');
    assert.equal(owner.reserved_by, null);
    assert.equal(owner.is_group_gift, false);
    assert.equal(owner.buy_url_dead, false);
    assert.equal(owner.funded_at, null);
    assert.equal(JSON.stringify(owner.reveal).includes('80'), false);
    assert.equal(JSON.stringify(owner).includes('"amount"'), false);
    assert.equal(formatContributorList(owner.reveal.contributors).includes('Alex'), true);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);
  });

  it('past-reveal grinder is already from the group; givers still see dollar progress', () => {
    const giver = getDemoItem('demo-grinder');
    assert.ok(giver);
    assert.equal(giver.is_group_gift, true);
    assert.equal(isFunded(giver), true);
    assert.equal(giver.reveal_at, shiftLocalDate(-1));
    assert.ok(pledgeTotal(giver) >= (giver.target_amount ?? 0));
    assert.ok(giver.pledges?.some((row) => row.display_name === 'Sam'));
    assert.ok(giver.pledges?.some((row) => row.amount === 120));

    const owner = ownerSafeItem(giver);
    assert.ok(owner.reveal);
    assert.equal(owner.reveal.from_group, true);
    assert.ok(owner.reveal.contributors.includes('Sam'));
    assert.ok(owner.reveal.contributors.includes('Anonymous'));
    assert.equal(owner.pledges, undefined);
    assert.equal(owner.funded_at, null);
    assert.equal(JSON.stringify(owner).includes('"amount"'), false);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);
  });

  it('dead-link throw suggests vibe alternatives to givers only', () => {
    const giver = getDemoItem('demo-throw');
    assert.ok(giver);
    assert.equal(inspectBuyLink(giver), 'dead');
    const swaps = suggestSubstitutes(giver);
    assert.ok(swaps.length >= 1);
    assert.equal(swaps.every((row) => row.exactSku), false);
    assert.ok(swaps.some((row) => /throw|linen|cotton/i.test(row.title)));

    const owner = ownerSafeItem(giver);
    assert.equal(owner.buy_url_dead, false);
    assert.equal(owner.reveal, undefined);
    assert.equal(owner.status, 'available');
  });

  it('exact lock mug never offers alternate SKUs', () => {
    const mug = getDemoItem('demo-mug');
    assert.ok(mug);
    assert.equal(mug.no_substitution, true);
    const swaps = suggestSubstitutes(mug);
    assert.equal(swaps.length, 1);
    assert.equal(swaps[0].exactSku, true);
    assert.match(swaps[0].reason, /Exact lock/i);
  });

  it('owner list never includes reserved socks or purchased plant status', () => {
    const owners = listDemoItems().map(ownerSafeItem);
    const socks = owners.find((item) => item.id === 'demo-socks');
    const plant = owners.find((item) => item.id === 'demo-plant');
    const espresso = owners.find((item) => item.id === 'demo-espresso');
    const grinder = owners.find((item) => item.id === 'demo-grinder');
    assert.ok(socks);
    assert.ok(plant);
    assert.ok(espresso);
    assert.ok(grinder);
    assert.equal(socks.status, 'available');
    assert.equal(socks.reserved_by, null);
    assert.equal(plant.status, 'available');
    assert.equal(plant.reserved_by, null);
    assert.equal(espresso.reveal, undefined);
    assert.ok(grinder.reveal);
    assert.ok(owners.every((item) => ownerPayloadLeaksGiftProgress(item) === null));
  });
});
