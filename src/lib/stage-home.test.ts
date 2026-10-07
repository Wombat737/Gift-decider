import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { PrettyCopy } from './copy';
import { getDemoItem, resetDemoStore } from './demo-store';
import { groupGiftPhase } from './pledges';
import {
  StageThumbRadius,
  StageThumbSize,
  giverCardSecondary,
  pickKindLabel,
  stageGreeting,
  stageTabSelected,
  stageTabVisible,
  thumbInitials,
} from './stage-home';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

function chrome(src: string) {
  return src.replace(/^import[\s\S]*?;\n/gm, '').replace(/WishlistItem/g, 'Item').replace(/useWishlist/g, '');
}

describe('Stage home', () => {
  it('locks picks chrome and Exact versus Taste', () => {
    assert.equal(PrettyCopy.ownerHomeTitle, 'Your picks');
    assert.equal(PrettyCopy.ownerEmptyCta, 'Add a pick');
    assert.equal(PrettyCopy.ownerSection, 'On your picks');
    assert.equal(PrettyCopy.ownerShareLink, 'Send to whoever’s choosing');
    assert.equal(PrettyCopy.ownerEmptyTitle, 'What moves you?');
    assert.equal(PrettyCopy.giverHeadline, 'They’re set · you decide');
    assert.equal(PrettyCopy.giverChooseCta, 'Choose this');
    assert.equal(PrettyCopy.giverSoftLockCta, 'Mark soft-locked');
    assert.equal(PrettyCopy.giverEmptyTitle, 'Quiet picks');
    assert.equal(PrettyCopy.giverEmptyCta, 'Nudge them');
    assert.equal(pickKindLabel('exact'), 'Exact');
    assert.equal(pickKindLabel('vibe'), 'Taste');
    assert.equal(PrettyCopy.ownerHomeTitle.includes('Signature'), false);
  });

  it('greets with a daypart and frames initials instead of a photo', () => {
    assert.equal(stageGreeting('Sam Lee', new Date(2026, 9, 7, 9, 41)), 'Morning, Sam');
    assert.equal(stageGreeting('Sam Lee', new Date(2026, 9, 7, 15, 0)), 'Afternoon, Sam');
    assert.equal(stageGreeting(null, new Date(2026, 9, 7, 20, 0)), 'Evening');
    assert.equal(thumbInitials('Linen throw, terracotta'), 'LT');
    assert.equal(thumbInitials('Notebook — soft cover'), 'NS');
    assert.equal(thumbInitials('Mug'), 'MU');
    assert.ok(StageThumbSize >= 72 && StageThumbSize <= 96);
    assert.ok(StageThumbRadius >= 12 && StageThumbRadius <= 16);
  });

  it('shows Chip in only on a collecting group pick, and soft-lock on a solo open pick', () => {
    resetDemoStore();
    const mug = getDemoItem('demo-mug')!;
    const espresso = getDemoItem('demo-espresso')!;
    assert.equal(giverCardSecondary(mug, groupGiftPhase(mug)), 'soft-lock');
    assert.equal(giverCardSecondary(espresso, groupGiftPhase(espresso)), 'chip-in');
    assert.equal(giverCardSecondary({ ...mug, status: 'reserved' }, null), null);
    assert.equal(stageTabVisible('/wishlist'), true);
    assert.equal(stageTabVisible('/add'), true);
    assert.equal(stageTabVisible('/settings'), true);
    assert.equal(stageTabVisible('/people'), false);
    assert.equal(stageTabVisible('/g/demo'), false);
    assert.equal(stageTabSelected('/settings'), 'me');
    assert.equal(stageTabSelected('/add'), 'add');
    assert.equal(stageTabSelected('/wishlist'), 'home');
  });

  it('keeps owner home surprise-safe and free of dashboard chrome', () => {
    const owner = chrome(source('app/(app)/wishlist.tsx'));
    const row = chrome(source('components/stage-pick-row.tsx'));
    const thumb = chrome(source('components/stage-thumb.tsx'));
    const home = `${owner}\n${row}\n${thumb}`;
    assert.equal(/purchased|funded|\btaken\b|\bbought\b|wishlist|shop|shopping|signature/i.test(home), false);
    assert.equal(/StatusChip|ItemGrid|InboxBanner|QuietSelect|picsum|HeroWash/.test(home), false);
    assert.match(owner, /PrettyCopy\.ownerHomeTitle/);
    assert.match(owner, /PrettyCopy\.ownerEmptyCta/);
    assert.match(owner, /PrettyCopy\.ownerShareLink/);
    assert.match(owner, /router\.push\('\/share'\)/);
    assert.match(source('components/stage-tab-bar.tsx'), /Home/);
    assert.match(source('components/stage-tab-bar.tsx'), /Add/);
    assert.match(source('components/stage-tab-bar.tsx'), /Me/);
    assert.match(source('components/stage-tab-bar.tsx'), /minHeight: 44/);
    assert.match(owner, /minHeight: 44/);
    assert.match(source('constants/theme.ts'), /0 1px 2px rgb\(0 0 0 \/ 0\.04\), 0 4px 12px rgb\(0 0 0 \/ 0\.06\)/);
  });

  it('stacks giver cards with Choose this and does not rename the app', () => {
    const giver = source('app/g/[token]/index.tsx');
    assert.match(giver, /PrettyCopy\.giverHeadline/);
    assert.match(source('components/stage-giver-card.tsx'), /PrettyCopy\.giverChooseCta/);
    assert.match(giver, /PrettyCopy\.giverEmptyTitle/);
    assert.match(giver, /PrettyCopy\.giverEmptyCta/);
    assert.match(giver, /StageGiverCard/);
    assert.match(giver, /Search gifts/);
    assert.equal(/ItemGrid[^S]/.test(giver), false);
    assert.match(source('components/stage-giver-card.tsx'), /minHeight: 44/);
    const appJson = readFileSync(join(repo, 'app.json'), 'utf8');
    assert.match(appJson, /"name": "Gift Decider"/);
    assert.equal(appJson.includes('Meantvo'), false);
  });
});
