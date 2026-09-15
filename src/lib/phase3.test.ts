import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import {
  addDemoPledge,
  getDemoItem,
  listDemoItems,
  resetDemoStore,
  setDemoDelivery,
  setDemoItemStatus,
  setDemoOrganiser,
  simulateDemoFunded,
  simulateDemoReveal,
} from './demo-store';
import { giverItemChipLabel } from './format';
import { inspectBuyLink } from './link-health';
import {
  formatContributorList,
  groupGiftPhase,
  isFunded,
  isRevealedToOwner,
  localDateISO,
  pickOrganiserName,
  pledgeRemaining,
  pledgeTotal,
  readyToBuyEmailPreview,
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
    assert.equal(stillHidden.organiser_name, null);
    assert.equal(stillHidden.pay_instructions, null);
    assert.equal(stillHidden.notices, undefined);
    assert.equal(JSON.stringify(stillHidden).includes('PayID'), false);
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
    assert.equal(JSON.stringify(owner).includes('PayID'), false);
    assert.equal(owner.organiser_name, null);
    assert.equal(owner.pay_instructions, null);
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
    assert.equal(JSON.stringify(owner).includes('BSB'), false);
    assert.equal(owner.pay_instructions, null);
    assert.equal(owner.organiser_name, null);
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

  it('exact lock mug never offers substitutes', () => {
    const mug = getDemoItem('demo-mug');
    assert.ok(mug);
    assert.equal(mug.no_substitution, true);
    const swaps = suggestSubstitutes(mug);
    assert.equal(swaps.length, 0);
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

  it('organiser is who marked the group gift, else first named pledge, else the organiser', () => {
    const espresso = getDemoItem('demo-espresso');
    assert.ok(espresso);
    assert.equal(pickOrganiserName(espresso), 'Alex');
    assert.equal(pickOrganiserName({ ...espresso, organiser_name: null }), 'Alex');
    assert.equal(pickOrganiserName({ ...espresso, organiser_name: null, pledges: [] }), 'the organiser');
    const handed = setDemoOrganiser('demo-espresso', 'Sam');
    assert.equal(handed.organiser_name, 'Sam');
    assert.equal(pickOrganiserName(handed), 'Sam');
  });

  it('simulate funded creates a ready-to-buy notice and email stub; givers still see amounts', () => {
    const espresso = getDemoItem('demo-espresso');
    assert.ok(espresso);
    assert.equal(groupGiftPhase(espresso), 'collecting');
    assert.equal(giverItemChipLabel(espresso), 'Open · Collecting');
    assert.match(espresso.pay_instructions ?? '', /PayID/);

    const funded = simulateDemoFunded('demo-espresso');
    assert.equal(groupGiftPhase(funded), 'ready_to_buy');
    assert.equal(giverItemChipLabel(funded), 'Ready to buy');
    assert.ok(funded.notices?.some((row) => row.kind === 'ready_to_buy'));
    const notice = funded.notices?.find((row) => row.kind === 'ready_to_buy');
    assert.ok(notice);
    assert.match(notice.title, /Funded — time to buy/);
    assert.match(notice.email_preview, /Funded — time to buy/);
    assert.match(notice.email_preview, /honour system/i);
    const preview = readyToBuyEmailPreview(funded);
    assert.match(preview.subject, /Funded — time to buy/);
    assert.ok(pledgeTotal(funded) >= (funded.target_amount ?? 0));
    assert.ok(funded.pledges?.some((row) => row.amount === 80));

    const owner = ownerSafeItem(funded);
    assert.equal(owner.reveal, undefined);
    assert.equal(owner.pay_instructions, null);
    assert.equal(owner.organiser_name, null);
    assert.equal(owner.notices, undefined);
    assert.equal(owner.delivery_method, null);
    assert.equal(JSON.stringify(owner).includes('PayID'), false);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);
  });

  it('chipping in the remainder marks ready to buy without waiting for mark-funded', () => {
    const espresso = getDemoItem('demo-espresso');
    assert.ok(espresso);
    const remaining = pledgeRemaining(espresso);
    assert.ok(remaining && remaining > 0);
    addDemoPledge('demo-espresso', remaining, 'Jo');
    const funded = getDemoItem('demo-espresso');
    assert.ok(funded);
    assert.equal(groupGiftPhase(funded), 'ready_to_buy');
    assert.ok(funded.notices?.some((row) => row.kind === 'ready_to_buy'));
    assert.equal(isRevealedToOwner(funded), false);
    assert.equal(ownerSafeItem(funded).reveal, undefined);
  });

  it('organiser can mark purchased and pick delivery without revealing to the owner', () => {
    simulateDemoFunded('demo-espresso');
    const delivered = setDemoDelivery('demo-espresso', 'collect', 'Pickup Saturday');
    assert.equal(delivered.delivery_method, 'collect');
    const bought = setDemoItemStatus('demo-espresso', 'purchased', 'Alex');
    assert.equal(bought.status, 'purchased');
    assert.equal(groupGiftPhase(bought), 'purchased');
    assert.equal(giverItemChipLabel(bought), 'Bought');
    assert.equal(isRevealedToOwner(bought), false);

    const owner = ownerSafeItem(bought);
    assert.equal(owner.reveal, undefined);
    assert.equal(owner.status, 'available');
    assert.equal(owner.delivery_method, null);
    assert.equal(owner.delivery_note, null);
    assert.equal(JSON.stringify(owner).includes('Pickup'), false);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);

    const revealed = simulateDemoReveal('demo-espresso', 'yesterday');
    assert.equal(groupGiftPhase(revealed), 'revealed');
    assert.equal(giverItemChipLabel(revealed), 'Bought · Revealed');
    const ownerRevealed = ownerSafeItem(revealed);
    assert.ok(ownerRevealed.reveal?.contributors.includes('Alex'));
    assert.equal(ownerRevealed.pay_instructions, null);
    assert.equal(ownerRevealed.delivery_method, null);
    assert.equal(JSON.stringify(ownerRevealed).includes('PayID'), false);
    assert.equal(ownerPayloadLeaksGiftProgress(ownerRevealed), null);
  });

  it('grinder is purchased, revealed to the owner by name only, and givers still see pay notes', () => {
    const giver = getDemoItem('demo-grinder');
    assert.ok(giver);
    assert.equal(groupGiftPhase(giver), 'revealed');
    assert.equal(giverItemChipLabel(giver), 'Bought · Revealed');
    assert.equal(giver.organiser_name, 'Sam');
    assert.match(giver.pay_instructions ?? '', /BSB/);
    assert.equal(giver.delivery_method, 'to_organiser');
    assert.ok(giver.notices?.some((row) => row.kind === 'ready_to_buy'));

    const owner = ownerSafeItem(giver);
    assert.ok(owner.reveal?.contributors.includes('Sam'));
    assert.equal(owner.pay_instructions, null);
    assert.equal(owner.organiser_name, null);
    assert.equal(owner.delivery_method, null);
    assert.equal(JSON.stringify(owner).includes('BSB'), false);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);
  });
});
