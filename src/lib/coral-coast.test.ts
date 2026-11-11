import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CoralCoast, CoralCoastDark } from '../constants/coral-coast';
import { getDemoItem, resetDemoStore, simulateDemoFunded } from './demo-store';
import { ownerSafeItem } from './surprise-safe';
import { giverChipTone, isOwnerForbiddenTone, ownerMomentTone } from './tones';

const LEMON_WASH = '#FFF8E7';
const SUNROOM_CREAM = '#F7F1E8';
const SUNROOM_MOSS = '#2F6B5A';
const SUNROOM_CORAL = '#E07A5F';

describe('Sunday Edition design tokens', () => {
  it('locks paper, card, rule, stone, muted, ink, and oxblood', () => {
    assert.equal(CoralCoast.bg, '#F3EFE6');
    assert.equal(CoralCoast.surface, '#FBF9F4');
    assert.equal(CoralCoast.paper, '#F3EFE6');
    assert.equal(CoralCoast.ink, '#1A1714');
    assert.equal(CoralCoast.brand, '#7A1F2B');
    assert.equal(CoralCoast.brandSoft, '#E4DCCC');
    assert.equal(CoralCoast.accent, '#7A1F2B');
    assert.equal(CoralCoast.accentSoft, '#E4DCCC');
    assert.equal(CoralCoast.border, '#D9D2C4');
    assert.equal(CoralCoast.stone, '#E4DCCC');
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

  it('keeps the dark palette on the same off-white chrome', () => {
    assert.equal(CoralCoastDark.bg, '#F3EFE6');
    assert.equal(CoralCoastDark.surface, '#FBF9F4');
    assert.equal(CoralCoastDark.paper, '#F3EFE6');
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
    assert.equal(giverChipTone(grinder), 'success');
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

describe('Headlines use Instrument Serif and UI uses Inter', () => {
  it('title, heading, and moment styles use Fonts.serif', () => {
    const text = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../components/themed-text.tsx'), 'utf8');
    for (const name of ['heading', 'title', 'moment']) {
      const block = text.match(new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\n  \\},`))?.[1] ?? '';
      assert.match(block, /fontFamily: Fonts\.serif/);
    }
    assert.match(text, /FontFamilies\.sans/);
  });

  it('loads Instrument Serif and Inter, not Fraunces', () => {
    const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../global.css'), 'utf8');
    const fonts = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../components/web-fonts.tsx'), 'utf8');
    const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../app/+html.tsx'), 'utf8');
    const theme = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../constants/theme.ts'), 'utf8');
    assert.equal(css.includes('Fraunces'), false);
    assert.equal(fonts.includes('Fraunces'), false);
    assert.equal(html.includes('Fraunces'), false);
    assert.match(css, /--font-display:\s*var\(--font-serif\)/);
    assert.match(css, /Instrument Serif/);
    assert.match(fonts, /Instrument\+Serif/);
    assert.match(theme, /InstrumentSerif_400Regular/);
    assert.match(theme, /Inter_400Regular/);
  });
});

