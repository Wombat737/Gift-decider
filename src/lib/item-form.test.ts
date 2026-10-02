import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { noSubstitutionForSave } from './item-form';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Add/edit Exact, taste, and target', () => {
  it('treats Exact as no substitutes and leaves the taste lock explicit', () => {
    assert.equal(noSubstitutionForSave('exact', false), true);
    assert.equal(noSubstitutionForSave('exact', true), true);
    assert.equal(noSubstitutionForSave('vibe', false), false);
    assert.equal(noSubstitutionForSave('vibe', true), true);

    const fields = source('components/item-fields.tsx');
    const add = source('app/(app)/add.tsx');
    const edit = source('app/(app)/item/[id].tsx');

    assert.match(fields, /itemKind === 'vibe'/);
    assert.match(fields, /noSubstitution: true/);
    assert.match(fields, /VibeChips/);
    assert.match(fields, /FieldHelp\.noSubs/);
    assert.match(fields, /FieldHelp\.vibe/);
    assert.match(fields, /targetAmount: ''/);
    assert.match(add, /noSubstitutionForSave/);
    assert.match(edit, /noSubstitutionForSave/);
    assert.match(add, /Pin to wishlist/);
    assert.equal(/No substitutions/.test(add), false);
  });
});
