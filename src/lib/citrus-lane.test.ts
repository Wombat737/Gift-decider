import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CitrusLane } from '../constants/citrus-lane';
import { getDemoItem, resetDemoStore, simulateDemoFunded } from './demo-store';
import { ownerSafeItem } from './surprise-safe';
import { giverChipTone, isOwnerForbiddenTone, ownerMomentTone } from './tones';

describe('Citrus Lane design tokens', () => {
  it('locks lemon wash, teal brand, and amber chip-in', () => {
    assert.equal(CitrusLane.bg, '#FFF8E7');
    assert.equal(CitrusLane.surface, '#FFFCF5');
    assert.equal(CitrusLane.ink, '#14120B');
    assert.equal(CitrusLane.brand, '#0D9488');
    assert.equal(CitrusLane.brandSoft, '#D5F5F0');
    assert.equal(CitrusLane.accent, '#F59E0B');
    assert.notEqual(CitrusLane.bg, '#F7F1E8');
    assert.notEqual(CitrusLane.brand, '#2F6B5A');
    assert.notEqual(CitrusLane.accent, '#E07A5F');
  });

  it('keeps cards 16, buttons 12, pills full', () => {
    assert.equal(CitrusLane.radius.card, 16);
    assert.equal(CitrusLane.radius.button, 12);
    assert.equal(CitrusLane.radius.pill, 999);
  });
});

describe('Citrus Lane colour law — no success/purchased/reserved on owner views', () => {
  it('owner moment tone is brand, never a forbidden status tone', () => {
    assert.equal(ownerMomentTone(), 'brand');
    assert.equal(isOwnerForbiddenTone(ownerMomentTone()), false);
    assert.equal(isOwnerForbiddenTone('success'), true);
    assert.equal(isOwnerForbiddenTone('reserved'), true);
    assert.equal(isOwnerForbiddenTone('purchased'), true);
  });

  it('giver chips: amber chip-in, teal buy/bought, reserved Taken; owner payloads look Open', () => {
    resetDemoStore();
    const socks = getDemoItem('demo-socks')!;
    const espresso = getDemoItem('demo-espresso')!;
    const grinder = getDemoItem('demo-grinder')!;

    assert.equal(giverChipTone(socks), 'reserved');
    assert.equal(giverChipTone(espresso), 'accent');
    assert.equal(giverChipTone(grinder), 'brand');
    assert.equal(giverChipTone(simulateDemoFunded('demo-espresso')), 'brand');

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
