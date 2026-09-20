import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { FieldHelp, HelpFaq } from './help';
import { giverListTitle, personListTitle, possessiveName } from './list-title';

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

    const layout = source('app/(app)/_layout.tsx');
    assert.match(layout, /Your wishlist/);
    assert.equal(/My wishlist/.test(layout), false);

    const add = source('app/(app)/add.tsx');
    assert.equal(/FlowHeader/.test(add), false);
    assert.equal(/Pin a gift/.test(add), false);
  });
});
