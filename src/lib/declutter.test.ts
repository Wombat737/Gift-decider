import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { FieldHelp, HelpFaq } from './help';
import { giverListTitle, personListTitle, possessiveName } from './list-title';
import { shouldShowOccasionFilter } from './occasions';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Declutter / noise-reduction', () => {
  it('names a giver list from first name or handle', () => {
    assert.equal(possessiveName('Kiri'), "Kiri's");
    assert.equal(personListTitle('Kiri Walsh', null), "Kiri's list");
    assert.equal(personListTitle('James Brown', 'jb'), "James' list");
    assert.equal(personListTitle(null, '@jordan'), "jordan's list");
    assert.equal(personListTitle(null, null), 'Their list');
    assert.equal(giverListTitle({ owner_display_name: 'Kiri Walsh', owner_handle: 'kiri' }), "Kiri's list");
    assert.equal(giverListTitle(null, { loading: true }), 'Opening list…');
    assert.equal(giverListTitle(null, { unmatched: true }), 'Shared wishlist');
    assert.equal(shouldShowOccasionFilter(0), false);
    assert.equal(shouldShowOccasionFilter(1), false);
    assert.equal(shouldShowOccasionFilter(2), true);
  });

  it('moves how-to copy into Settings FAQ and field ? tips', () => {
    assert.ok(HelpFaq.length >= 6);
    assert.match(HelpFaq[0].q, /Exact/);
    assert.match(FieldHelp.exactVsTaste.body, /Exact/);
    assert.match(FieldHelp.noSubs.body, /lock/);
    assert.match(FieldHelp.chipIn.body, /reveal/);
    assert.match(FieldHelp.vibe.body, /Chips/);

    const settings = source('app/(app)/settings.tsx');
    const fields = source('components/item-fields.tsx');
    const tip = source('components/help-tip.tsx');
    assert.match(settings, /Instructions/);
    assert.match(settings, /HelpFaq/);
    assert.match(fields, /FieldHelp\.exactVsTaste/);
    assert.match(fields, /FieldHelp\.noSubs/);
    assert.match(fields, /FieldHelp\.chipIn/);
    assert.match(fields, /FieldHelp\.vibe/);
    assert.match(fields, /FieldHelp\.buyLink/);
    assert.match(source('components/photo-field.tsx'), /FieldHelp\.photo/);
    assert.match(source('app/(app)/paste.tsx'), /FieldHelp\.instagram/);
    assert.match(source('app/(app)/people.tsx'), /FieldHelp\.findSomeone/);
    assert.match(tip, /accessibilityLabel/);
    assert.match(tip, /showHelp/);
    assert.match(tip, /\?/);
  });

  it('strips view pills and on-screen how-to essays', () => {
    const screens = [
      source('app/(app)/add.tsx'),
      source('app/(app)/wishlist.tsx'),
      source('app/(app)/share.tsx'),
      source('app/(app)/people.tsx'),
      source('app/(app)/requests.tsx'),
      source('app/(app)/paste.tsx'),
      source('app/g/[token]/index.tsx'),
      source('components/flow-header.tsx'),
      source('components/item-fields.tsx'),
    ].join('\n');

    assert.equal(/accessibilityLabel="Your list"/.test(screens), false);
    assert.equal(/accessibilityLabel="Giver view"/.test(screens), false);
    assert.equal(/YOUR LIST/.test(screens), false);
    assert.equal(/useListSwitcher/.test(screens), false);
    assert.equal(/Photo-first list for/.test(screens), false);
    assert.equal(/Camera \+ Storage upload/.test(screens), false);
    assert.equal(/Vibes help givers match the board/.test(screens), false);
    assert.equal(/Create an occasion pack on the Share screen/.test(screens), false);
    assert.equal(/Shows a lock to givers\. If the buy link is dead/.test(screens), false);
    assert.equal(/Used if givers chip in/.test(screens), false);

    const wishlist = source('app/(app)/wishlist.tsx');
    assert.equal(/FilterChips/.test(wishlist), false);
    assert.equal(/label: 'All'/.test(wishlist), false);
    assert.match(wishlist, /QuietSelect/);
    assert.match(wishlist, /shouldShowOccasionFilter/);
    assert.equal(/YOUR LIST/.test(wishlist), false);
    assert.equal(/accessibilityLabel="Your list"/.test(wishlist), false);
    assert.equal(/accessibilityLabel="Giver view"/.test(wishlist), false);

    const layout = source('app/(app)/_layout.tsx');
    assert.match(layout, /Your wishlist/);
    assert.equal(/My wishlist/.test(layout), false);

    const add = source('app/(app)/add.tsx');
    assert.equal(/FlowHeader/.test(add), false);
    assert.equal(/Pin a gift/.test(add), false);
  });

  it('keeps ? tips beside complex fields and a one-line dead link on the giver item', () => {
    const tip = source('components/help-tip.tsx');
    const fields = source('components/item-fields.tsx');
    const giverItem = source('app/g/[token]/[itemId].tsx');
    const ownerItem = source('app/(app)/item/[id].tsx');

    assert.match(tip, /flexShrink: 0/);
    assert.match(fields, /FieldHelp\.exactVsTaste/);
    assert.match(fields, /FieldHelp\.noSubs/);
    assert.match(fields, /FieldHelp\.chipIn/);
    assert.match(fields, /FieldHelp\.vibe/);
    assert.match(fields, /FieldHelp\.buyLink/);
    assert.equal(/Shows a lock to givers/.test(fields), false);

    assert.match(giverItem, /Buy online/);
    assert.match(giverItem, /\(link’s dead\)/);
    assert.match(giverItem, /linkNeedsHeal/);
    assert.match(giverItem, /PledgePanel/);
    assert.match(giverItem, /footer=\{/);
    assert.match(giverItem, /updateStatus\('reserved'\)/);
    assert.match(giverItem, /updateStatus\('purchased'\)/);
    assert.equal(/LinkHealPanel/.test(giverItem), false);
    assert.equal(/check-buy-link/.test(giverItem), false);
    assert.equal(/giver-link-heal/.test(giverItem), false);
    assert.equal(/mark-link-dead/.test(giverItem), false);
    assert.equal(/See alternatives/.test(giverItem), false);

    assert.equal(/link’s dead/.test(ownerItem), false);
    assert.equal(/LinkHealPanel/.test(ownerItem), false);
    assert.equal(/Buy online/.test(ownerItem), false);
  });
});
