import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CoralCoast } from '../constants/coral-coast';
import { PrettyCopy } from './copy';
import {
  BUTTON_PRESS_MS,
  BUTTON_PRESS_SCALE,
  COIN_TRICKLE_MS,
  DOLLAR_FLICK_MS,
  activeDelight,
  resetDelight,
  tryStartDelight,
} from './delight';
import { giverChipTone } from './tones';
import { getDemoItem, resetDemoStore, setDemoItemStatus, simulateDemoFunded } from './demo-store';
import { ownerSafeItem } from './surprise-safe';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Pretty pass punch-list', () => {
  it('P0 tokens: off-white chrome, white surface, brand-soft and accent-soft', () => {
    assert.equal(CoralCoast.bg, '#FAFAFA');
    assert.equal(CoralCoast.surface, '#FFFFFF');
    assert.equal(CoralCoast.brandSoft, '#FFE8E4');
    assert.equal(CoralCoast.accentSoft, '#FFF3D1');
    assert.equal(CoralCoast.brand, '#E85D4C');
    assert.equal(CoralCoast.accent, '#F5B942');
    const theme = source('constants/theme.ts');
    assert.match(theme, /0 1px 2px rgb\(0 0 0 \/ 0\.04\), 0 4px 12px rgb\(0 0 0 \/ 0\.06\)/);
    assert.match(theme, /twoHalf: 12/);
    assert.equal(source('global.css').includes('Fraunces'), false);
    assert.match(source('global.css'), /--bg:\s*#fafafa/);
  });

  it('P0 type: Plus Jakarta Sans scale caption→display, body min 16', () => {
    const theme = source('constants/theme.ts');
    const text = source('components/themed-text.tsx');
    assert.match(theme, /caption: \{ fontSize: 12, lineHeight: 16, fontWeight: '500'/);
    assert.match(theme, /body: \{ fontSize: 16, lineHeight: 24, fontWeight: '400'/);
    assert.match(theme, /bodyEm: \{ fontSize: 16, lineHeight: 24, fontWeight: '500'/);
    assert.match(theme, /titleSm: \{ fontSize: 18, lineHeight: 24, fontWeight: '600'/);
    assert.match(theme, /title: \{ fontSize: 22, lineHeight: 28, fontWeight: '600'/);
    assert.match(theme, /display: \{ fontSize: 28, lineHeight: 34, fontWeight: '700'/);
    assert.match(text, /type === 'display'/);
    assert.match(source('components/web-fonts.tsx'), /Plus\+Jakarta\+Sans/);
    assert.match(source('app/+html.tsx'), /Plus\+Jakarta\+Sans/);
  });

  it('P0 spacing: 16 card padding, 24 section gaps on home + list', () => {
    const screen = source('components/screen.tsx');
    const card = source('components/card.tsx');
    const itemCard = source('components/item-card.tsx');
    const wishlist = source('app/(app)/wishlist.tsx');
    assert.match(screen, /gap: Spacing\.four/);
    assert.match(card, /padding: Spacing\.three/);
    assert.match(itemCard, /padding: Spacing\.three/);
    assert.match(wishlist, /gap: Spacing\.twoHalf/);
  });

  it('P1 home pills, gift cards, empties, and share sheet use matey copy', () => {
    const header = source('components/flow-header.tsx');
    const card = source('components/item-card.tsx');
    const empty = source('components/empty-state.tsx');
    const wishlist = source('app/(app)/wishlist.tsx');
    const giverList = source('app/g/[token]/index.tsx');
    const share = source('app/(app)/share.tsx');

    assert.match(header, /minHeight: 44/);
    assert.match(header, /theme\.brandSoft/);
    assert.match(header, /Your list/);
    assert.match(header, /Giver view/);
    assert.match(card, /aspectRatio: 4 \/ 5/);
    assert.match(card, /type="titleSm"/);
    assert.match(card, /themeColor="brand"/);
    assert.match(card, /Open/);
    assert.match(empty, /type="display"/);
    assert.match(wishlist, /PrettyCopy\.ownerEmptyTitle/);
    assert.match(wishlist, /PrettyCopy\.ownerEmptySecondary/);
    assert.match(giverList, /PrettyCopy\.giverEmptyTitle/);
    assert.match(giverList, /PrettyCopy\.giverEmptyCta/);
    assert.match(share, /PrettyCopy\.shareTitle/);
    assert.match(share, /PrettyCopy\.shareCta/);
    assert.equal(PrettyCopy.ownerEmptyTitle, 'What are you after?');
    assert.equal(PrettyCopy.ownerEmptyCta, 'Add a gift');
    assert.equal(PrettyCopy.giverEmptyTitle, 'Their list is quiet — nudge them to add a few things.');
    assert.equal(PrettyCopy.shareTitle, 'Send this to whoever’s buying.');
    assert.equal(PrettyCopy.chipInHonour, 'PayID on honour — mark what you’ve sent.');
  });

  it('P2 chip-in strip, ready-to-buy banner, and purchased success chip stay giver-only', () => {
    resetDemoStore();
    const strip = source('components/group-gift-strip.tsx');
    const banner = source('components/ready-to-buy-banner.tsx');
    const ownerItem = source('app/(app)/item/[id].tsx');
    const giverItem = source('app/g/[token]/[itemId].tsx');

    assert.match(strip, /theme\.accentSoft/);
    assert.match(strip, /PrettyCopy\.chipInHonour/);
    assert.match(strip, /mate/);
    assert.match(banner, /theme\.brandSoft/);
    assert.match(banner, /Mark purchased/);
    assert.equal(giverChipTone(simulateDemoFunded('demo-espresso')), 'brand');
    assert.equal(giverChipTone(setDemoItemStatus('demo-mug', 'purchased', 'Alex')), 'success');
    assert.equal(giverChipTone(getDemoItem('demo-socks')!), 'reserved');
    assert.equal(JSON.stringify(ownerSafeItem(getDemoItem('demo-socks')!)).includes('Taken'), false);
    assert.equal(/DollarFlick/.test(ownerItem), false);
    assert.equal(/CoinTrickle/.test(ownerItem), false);
    assert.match(giverItem, /DollarFlick/);
    assert.equal(/StatusChip/.test(ownerItem), false);
  });

  it('P3 dollar flick, coin trickle stub, button scale, and reduce-motion', () => {
    const flick = source('components/dollar-flick.tsx');
    const trickle = source('components/coin-trickle.tsx');
    const button = source('components/button.tsx');
    assert.match(flick, /useReducedMotion/);
    assert.match(flick, /REDUCE_MOTION_TOAST_MS/);
    assert.match(flick, /pointerEvents="none"/);
    assert.match(trickle, /useReducedMotion/);
    assert.match(trickle, /pointerEvents="none"/);
    assert.equal(trickle.includes('lottie'), false);
    assert.match(button, /BUTTON_PRESS_SCALE/);
    assert.match(button, /useReducedMotion/);
    assert.equal(BUTTON_PRESS_SCALE, 0.96);
    assert.equal(BUTTON_PRESS_MS, 100);
    assert.equal(DOLLAR_FLICK_MS, 800);
    assert.ok(COIN_TRICKLE_MS <= 900);
  });

  it('delight is non-blocking, debounced, and one hero at a time', () => {
    resetDelight();
    assert.equal(tryStartDelight('flick', 1_000), true);
    assert.equal(activeDelight(), 'flick');
    assert.equal(tryStartDelight('trickle', 1_010), false);
    assert.equal(tryStartDelight('flick', 1_100), false);
    resetDelight();
    assert.equal(tryStartDelight('trickle', 2_000), true);
    resetDelight();
    assert.equal(tryStartDelight('flick', 3_000), true);
    resetDelight();
    assert.equal(tryStartDelight('flick', 3_000), true);
    assert.equal(tryStartDelight('flick', 3_400), false);
  });

  it('keeps sticky giver footer, keyboard dismiss, and live status refresh', () => {
    const screen = source('components/screen.tsx');
    const giverItem = source('app/g/[token]/[itemId].tsx');
    const giverList = source('app/g/[token]/index.tsx');
    assert.match(screen, /footer\?: ReactNode/);
    assert.match(screen, /keyboardShouldPersistTaps="handled"/);
    assert.match(screen, /onScrollBeginDrag=\{Keyboard\.dismiss\}/);
    assert.match(giverItem, /footer=\{/);
    assert.match(giverItem, /nativePress/);
    assert.match(giverItem, /updateStatus\('purchased'\)/);
    assert.match(giverList, /useFocusEffect/);
    assert.match(giverList, /refresh\(\{ silent: true \}\)/);
  });
});
