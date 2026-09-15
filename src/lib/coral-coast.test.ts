import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { CoralCoast, CoralCoastDark } from '../constants/coral-coast';
import { getDemoItem, resetDemoStore, simulateDemoFunded } from './demo-store';
import { ownerSafeItem } from './surprise-safe';
import { giverChipTone, isOwnerForbiddenTone, ownerMomentTone } from './tones';

const LEMON_WASH = '#FFF8E7';
const SUNROOM_CREAM = '#F7F1E8';
const SUNROOM_MOSS = '#2F6B5A';
const SUNROOM_CORAL = '#E07A5F';

describe('Coral Coast design tokens', () => {
  it('locks white base, coral brand, and sunshine chip-in', () => {
    assert.equal(CoralCoast.bg, '#FFFFFF');
    assert.equal(CoralCoast.surface, '#FFFFFF');
    assert.equal(CoralCoast.paper, '#FAFAFA');
    assert.equal(CoralCoast.ink, '#171717');
    assert.equal(CoralCoast.brand, '#E85D4C');
    assert.equal(CoralCoast.accent, '#F5B942');
    assert.equal(CoralCoast.border, '#E5E5E5');
  });

  it('does not keep Sunroom cream/moss or Citrus Lane lemon wash', () => {
    assert.notEqual(CoralCoast.bg, LEMON_WASH);
    assert.notEqual(CoralCoast.bg, SUNROOM_CREAM);
    assert.notEqual(CoralCoast.surface, LEMON_WASH);
    assert.notEqual(CoralCoast.surface, '#FFFBF6');
    assert.notEqual(CoralCoast.brand, SUNROOM_MOSS);
    assert.notEqual(CoralCoast.accent, SUNROOM_CORAL);
    assert.notEqual(CoralCoast.paper, '#E8DFD2');
    assert.equal(JSON.stringify(CoralCoast).includes(LEMON_WASH), false);
    assert.equal(JSON.stringify(CoralCoast).includes(SUNROOM_CREAM), false);
  });

  it('keeps the dark palette on the same white base', () => {
    assert.equal(CoralCoastDark.bg, '#FFFFFF');
    assert.equal(CoralCoastDark.surface, '#FFFFFF');
    assert.equal(CoralCoastDark.paper, '#FAFAFA');
    assert.notEqual(CoralCoastDark.bg, '#16201C');
    assert.notEqual(CoralCoastDark.bg, '#0C1716');
  });

  it('keeps cards 16, buttons 12, pills full', () => {
    assert.equal(CoralCoast.radius.card, 16);
    assert.equal(CoralCoast.radius.button, 12);
    assert.equal(CoralCoast.radius.pill, 999);
  });
});

describe('Coral Coast colour law — no success/purchased/reserved on owner views', () => {
  it('owner moment tone is brand, never a forbidden status tone', () => {
    assert.equal(ownerMomentTone(), 'brand');
    assert.equal(isOwnerForbiddenTone(ownerMomentTone()), false);
    assert.equal(isOwnerForbiddenTone('success'), true);
    assert.equal(isOwnerForbiddenTone('reserved'), true);
    assert.equal(isOwnerForbiddenTone('purchased'), true);
  });

  it('giver chips: sunshine chip-in, coral buy/bought, reserved Taken; owner payloads look Open', () => {
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
