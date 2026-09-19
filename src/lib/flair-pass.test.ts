import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PrettyCopy } from './copy';
import {
  BAR_PULSE_MS,
  BUTTON_PRESS_MS,
  BUTTON_PRESS_SCALE,
  DELIGHT_VARIANT,
  DOLLAR_FLICK_MS,
  SPARK_TRAVEL_PX,
} from './delight';
import { CoralCoast } from '../constants/coral-coast';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Flair pass (pretty v2) punch-list', () => {
  it('P0 wash tokens stay coral→cream / sunshine→white and locked palette', () => {
    const theme = source('constants/theme.ts');
    assert.match(theme, /hero: \['#FFE8E4', '#FAFAFA'\]/);
    assert.match(theme, /chipin: \['#FFF3D1', '#FFFFFF'\]/);
    assert.match(theme, /RingSelected = 'rgba\(232, 93, 76, 0\.4\)'/);
    assert.match(theme, /vertical: 10/);
    assert.match(theme, /horizontal: 14/);
    assert.match(theme, /IlluSize = 140/);
    assert.equal(CoralCoast.brandSoft, '#FFE8E4');
    assert.equal(CoralCoast.accentSoft, '#FFF3D1');
    assert.equal(CoralCoast.brand, '#E85D4C');
    assert.equal(CoralCoast.accent, '#F5B942');
    assert.equal(CoralCoast.bg, '#FAFAFA');
  });

  it('P0 hero wash is only on splash, empties, chip-in header, and reveal', () => {
    const splash = source('app/sign-in.tsx');
    const empty = source('components/empty-state.tsx');
    const strip = source('components/group-gift-strip.tsx');
    const reveal = source('components/funded-reveal.tsx');
    const grid = source('components/item-grid.tsx');
    const card = source('components/item-card.tsx');
    assert.match(splash, /HeroWash/);
    assert.match(splash, /PrettyCopy\.splash/);
    assert.match(empty, /HeroWash/);
    assert.match(empty, /EmptyIllustration/);
    assert.match(strip, /variant="chipin"/);
    assert.match(reveal, /HeroWash/);
    assert.match(reveal, /PrettyCopy\.revealDay/);
    assert.equal(/HeroWash/.test(grid), false);
    assert.equal(/HeroWash/.test(card), false);
  });

  it('P0 microcopy table', () => {
    assert.equal(PrettyCopy.splash, 'Gifts without the guesswork.');
    assert.equal(PrettyCopy.signInSub, 'Lists for you · easy for the mates buying.');
    assert.equal(PrettyCopy.ownerEmptyTitle, 'What are you after, legend?');
    assert.equal(PrettyCopy.ownerEmptyCta, 'Add a gift');
    assert.equal(PrettyCopy.giverEmptyTitle, 'Quiet list — nudge them to add a couple of bits.');
    assert.equal(PrettyCopy.shareTitle, 'Send this to whoever’s buying.');
    assert.equal(PrettyCopy.softLock, 'You’ve got this one.');
    assert.equal(PrettyCopy.purchasedGiver, 'Bought — nice one.');
    assert.equal(PrettyCopy.chipInCta, 'Chip in');
    assert.equal(PrettyCopy.chipInHonour, 'PayID on honour — tick off what you’ve sent.');
    assert.equal(PrettyCopy.revealDay, 'The mates chipped in — here’s who.');
    const giverItem = source('app/g/[token]/[itemId].tsx');
    const pledge = source('components/pledge-panel.tsx');
    assert.match(giverItem, /PrettyCopy\.softLock/);
    assert.match(giverItem, /PrettyCopy\.purchasedGiver/);
    assert.match(pledge, /PrettyCopy\.chipInCta/);
  });

  it('P0 card lift + selected ring + sticker chips', () => {
    const theme = source('constants/theme.ts');
    const card = source('components/card.tsx');
    const itemCard = source('components/item-card.tsx');
    const chips = source('components/vibe-chips.tsx');
    const status = source('components/status-chip.tsx');
    assert.match(theme, /0 2px 4px rgb\(0 0 0 \/ 0\.05\), 0 8px 20px rgb\(0 0 0 \/ 0\.07\)/);
    assert.match(theme, /0 8px 28px rgb\(232 93 76 \/ 0\.18\)/);
    assert.match(card, /selected/);
    assert.match(card, /RingSelected/);
    assert.match(itemCard, /selected=\{pressed\}/);
    assert.match(chips, /ChipPad/);
    assert.match(chips, /borderWidth: 2/);
    assert.match(chips, /theme\.brandSoft/);
    assert.match(chips, /transitionDuration: '120ms'/);
    assert.match(status, /ChipPad/);
    assert.match(itemCard, /theme\.accentSoft/);
  });

  it('P0 haptics skip web and wire purchased / chip-in / soft lock', () => {
    const haptics = source('lib/haptics.ts');
    const flick = source('components/dollar-flick.tsx');
    const pledge = source('components/pledge-panel.tsx');
    const giverItem = source('app/g/[token]/[itemId].tsx');
    assert.match(haptics, /Platform\.OS === 'web'/);
    assert.match(haptics, /isReduceMotionEnabled/);
    assert.match(haptics, /ImpactFeedbackStyle\.Light/);
    assert.match(haptics, /NotificationFeedbackType\.Success/);
    assert.match(haptics, /AndroidHaptics\.Confirm/);
    assert.match(flick, /hapticLight/);
    assert.match(pledge, /hapticSuccess/);
    assert.match(giverItem, /hapticLight/);
    assert.match(giverItem, /updateStatus\('reserved'\)/);
  });

  it('P1 splash is wash + line + one coral CTA; 3 empty SVGs', () => {
    const splash = source('app/sign-in.tsx');
    const art = source('components/empty-illustration.tsx');
    const empty = source('components/empty-state.tsx');
    const share = source('app/(app)/share.tsx');
    const wishlist = source('app/(app)/wishlist.tsx');
    const giverList = source('app/g/[token]/index.tsx');
    assert.match(splash, /HeroWash/);
    assert.match(splash, /PrettyCopy\.splash/);
    assert.match(splash, /PrettyCopy\.signInSub/);
    assert.equal(splash.includes('Card'), false);
    assert.match(art, /kind === 'owner'/);
    assert.match(art, /kind === 'giver'/);
    assert.match(art, /kind === 'invites'/);
    assert.match(art, /react-native-svg/);
    assert.equal(art.includes('linearGradient') || art.includes('LinearGradient'), false);
    assert.match(empty, /EmptyIllustration/);
    assert.match(wishlist, /emptyKind="owner"/);
    assert.match(giverList, /emptyKind="giver"/);
    assert.match(share, /kind="invites"/);
  });

  it('P1 $ flick v2 sparks and coin-bar pulse are reduce-motion safe', () => {
    const flick = source('components/dollar-flick.tsx');
    const strip = source('components/group-gift-strip.tsx');
    const trickle = source('components/coin-trickle.tsx');
    assert.match(flick, /useReducedMotion/);
    assert.match(flick, /SPARK_TRAVEL_PX/);
    assert.match(flick, /SparkDot/);
    assert.match(flick, /pointerEvents="none"/);
    assert.match(strip, /BAR_PULSE_MS/);
    assert.match(strip, /1\.02/);
    assert.match(trickle, /useReducedMotion/);
    assert.match(trickle, /pointerEvents="none"/);
    assert.equal(trickle.includes('lottie'), false);
    assert.equal(DELIGHT_VARIANT, 'v2');
    assert.equal(SPARK_TRAVEL_PX, 12);
    assert.equal(BAR_PULSE_MS, 150);
    assert.equal(DOLLAR_FLICK_MS, 800);
  });

  it('P2 icon lite, button press 0.97 + float shadow, surprise-safe reveal', () => {
    const icons = source('components/flair-icons.tsx');
    const button = source('components/button.tsx');
    const reveal = source('components/funded-reveal.tsx');
    const ownerItem = source('app/(app)/item/[id].tsx');
    for (const name of ['add', 'share', 'chip-in', 'lock', 'bought', 'payid', 'gift', 'nudge']) {
      assert.match(icons, new RegExp(`'${name}'`));
    }
    assert.match(icons, /strokeWidth: 1\.75/);
    assert.match(button, /ShadowFloat/);
    assert.match(button, /BUTTON_PRESS_SCALE/);
    assert.equal(BUTTON_PRESS_SCALE, 0.97);
    assert.equal(BUTTON_PRESS_MS, 100);
    assert.match(reveal, /PrettyCopy\.revealDay/);
    assert.match(reveal, /HeroWash/);
    assert.equal(/DollarFlick/.test(ownerItem), false);
    assert.equal(/CoinTrickle/.test(ownerItem), false);
    assert.equal(/hapticSuccess/.test(ownerItem), false);
  });

  it('preserves sticky giver footer, keyboard, dd/mm/yyyy, live refresh, no serif', () => {
    const screen = source('components/screen.tsx');
    const giverItem = source('app/g/[token]/[itemId].tsx');
    const giverList = source('app/g/[token]/index.tsx');
    const date = source('components/date-field.tsx');
    const text = source('components/themed-text.tsx');
    const css = source('global.css');
    assert.match(screen, /footer\?: ReactNode/);
    assert.match(screen, /keyboardShouldPersistTaps="handled"/);
    assert.match(screen, /onScrollBeginDrag=\{Keyboard\.dismiss\}/);
    assert.match(giverItem, /footer=\{/);
    assert.match(giverItem, /nativePress/);
    assert.match(giverList, /useFocusEffect/);
    assert.match(giverList, /refresh\(\{ silent \}\)/);
    assert.match(giverList, /peekGiverCatalog\(token\)\.length > 0/);
    assert.match(date, /formatRevealDate/);
    assert.match(text, /fontFamily: Fonts\.sans/);
    assert.equal(css.includes('Fraunces'), false);
    assert.equal(text.includes('Fonts.display'), false);
  });
});
