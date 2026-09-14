import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { Sunroom } from '../constants/sunroom';
import { getDemoItem, resetDemoStore } from './demo-store';
import { ownerSafeItem } from './surprise-safe';
import { giverChipTone, isOwnerForbiddenTone, ownerMomentTone } from './tones';

describe('Sunroom design tokens', () => {
  it('locks cream paper, moss brand, and coral chip-in', () => {
    assert.equal(Sunroom.bg, '#F7F1E8');
    assert.equal(Sunroom.surface, '#FFFBF6');
    assert.equal(Sunroom.ink, '#1F2A24');
    assert.equal(Sunroom.brand, '#2F6B5A');
    assert.equal(Sunroom.brandSoft, '#D8EBE3');
    assert.equal(Sunroom.accent, '#E07A5F');
    assert.notEqual(Sunroom.accent, '#C45C4A');
  });

  it('uses scrapbook radii — cards 16, buttons 12, pills full', () => {
    assert.equal(Sunroom.radius.card, 16);
    assert.equal(Sunroom.radius.button, 12);
    assert.equal(Sunroom.radius.pill, 999);
  });
});

describe('Sunroom colour law — no success/purchased/reserved on owner views', () => {
  it('owner moment tone is brand, never a forbidden status tone', () => {
    assert.equal(ownerMomentTone(), 'brand');
    assert.equal(isOwnerForbiddenTone(ownerMomentTone()), false);
    assert.equal(isOwnerForbiddenTone('success'), true);
    assert.equal(isOwnerForbiddenTone('reserved'), true);
    assert.equal(isOwnerForbiddenTone('purchased'), true);
  });

  it('giver chips can show Taken / Ready to buy; owner payloads look Open', () => {
    resetDemoStore();
    const socks = getDemoItem('demo-socks')!;
    const espresso = getDemoItem('demo-espresso')!;
    const grinder = getDemoItem('demo-grinder')!;

    assert.equal(giverChipTone(socks), 'reserved');
    assert.equal(giverChipTone(espresso), 'accent');
    assert.equal(giverChipTone(grinder), 'brand');

    const ownerSocks = ownerSafeItem(socks);
    const ownerEspresso = ownerSafeItem(espresso);
    const ownerGrinder = ownerSafeItem(grinder);
    assert.equal(ownerSocks.status, 'available');
    assert.equal(giverChipTone(ownerSocks), 'muted');
    assert.equal(giverChipTone(ownerEspresso), 'muted');
    assert.equal(ownerEspresso.reveal, undefined);
    assert.ok(ownerGrinder.reveal);
    assert.equal(isOwnerForbiddenTone(ownerMomentTone()), false);
    assert.equal(JSON.stringify(ownerSocks).includes('Taken'), false);
    assert.equal(JSON.stringify(ownerEspresso).includes('Ready to buy'), false);
  });
});
