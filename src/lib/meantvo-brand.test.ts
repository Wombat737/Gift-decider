import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PEEL_MOMENT_MS } from './delight';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

function pngColorType(rel: string) {
  const bytes = readFileSync(join(repo, rel));
  assert.equal(bytes.subarray(12, 16).toString(), 'IHDR');
  return bytes[25];
}

describe('Meantvo brand assets', () => {
  it('uses the RGB monogram for the icon and a centred splash mark', () => {
    assert.equal(pngColorType('assets/brand/opt1-monogram-icon-1024.png'), 2);
    assert.equal(pngColorType('assets/images/android-icon-foreground.png'), 2);
    assert.equal(pngColorType('assets/images/favicon.png'), 2);
    assert.equal(pngColorType('assets/images/splash-icon.png'), 6);
    const icon = readFileSync(join(repo, 'assets/brand/opt1-monogram-icon-1024.png'));
    assert.equal(icon.readUInt32BE(16), 1024);
    assert.equal(icon.readUInt32BE(20), 1024);

    const appJson = readFileSync(join(repo, 'app.json'), 'utf8');
    assert.match(appJson, /opt1-monogram-icon-1024\.png/);
    assert.match(appJson, /"backgroundColor": "#FAFAFA"/);
    assert.match(appJson, /"backgroundColor": "#E85D4C"/);
    assert.match(appJson, /splash-icon\.png/);
    assert.match(appJson, /favicon\.png/);
    assert.equal(appJson.includes('expo-sharing'), false);
  });

  it('puts the monogram in the sticky header at 28–32pt', () => {
    assert.match(source('components/meantvo-mark.tsx'), /HEADER_MARK_HEIGHT = 30/);
    const header = source('components/stage-sticky-header.tsx');
    assert.match(header, /MeantvoHeaderMark/);
    assert.match(header, /tone="onLight"/);
    assert.match(header, /HEADER_MARK_HEIGHT/);
    assert.match(header, /stageGreeting/);
    const mark = source('components/meantvo-mark.tsx');
    assert.match(mark, /onCoral/);
    assert.match(mark, /onLight/);
    assert.match(mark, /accessibilityLabel="Meantvo"/);
  });

  it('peels only for givers and keeps the empty picks art surprise-safe', () => {
    assert.ok(PEEL_MOMENT_MS >= 600 && PEEL_MOMENT_MS <= 900);
    const peel = source('components/peel-moment.tsx');
    assert.match(peel, /useReducedMotion/);
    assert.match(peel, /pointerEvents="none"/);
    assert.match(peel, /PEEL_MOMENT_MS/);
    assert.match(peel, /#F5B942|CoralCoast\.accent/);

    const wishlist = source('app/(app)/wishlist.tsx');
    assert.match(wishlist, /PeelArt/);
    assert.equal(wishlist.includes('PeelMoment'), false);

    const ownerItem = source('app/(app)/item/[id].tsx');
    assert.equal(ownerItem.includes('PeelMoment'), false);
    assert.equal(ownerItem.includes('PeelArt'), false);

    const giverItem = source('app/g/[token]/[itemId].tsx');
    assert.match(giverItem, /PeelMoment/);
    assert.match(giverItem, /!ownerPreview && peelKey > 0/);
    assert.match(giverItem, /hapticLight/);

    const card = source('components/stage-giver-card.tsx');
    assert.match(card, /!readOnly && peelKey > 0/);
    assert.match(card, /PeelMoment/);

    const giverList = source('app/g/[token]/index.tsx');
    assert.match(giverList, /peelKey=\{ownerPreview \? 0 : peel\.id === item\.id \? peel\.key : 0\}/);
  });
});
