import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { listAsPlainText, storeNameFromUrl } from './list-text';
import { DEFAULT_PREFS, readAppPrefs, resetMemoryPrefs, writeAppPrefs } from './preferences';
import { resizeAction } from './prepare-photo';

describe('Tester fixes', () => {
  it('shrinks a full-resolution photo and leaves a small one alone', () => {
    assert.deepEqual(resizeAction(4032, 3024), { resize: { width: 1600 } });
    assert.deepEqual(resizeAction(1200, 3000), { resize: { height: 1600 } });
    assert.equal(resizeAction(800, 800), null);
    assert.equal(resizeAction(0, 0), null);
  });

  it('copies a list as plain text without reserved or bought status', () => {
    const text = listAsPlainText('Birthday', [
      { title: 'Pyjamas', target_amount: 49, buy_url: 'https://www.peteralexander.com.au/pyjamas' },
      { title: 'Mug', target_amount: null, buy_url: null },
    ]);
    assert.match(text, /^Birthday\n\nPyjamas\n\$49\npeteralexander\.com\.au\nhttps:\/\/www\.peteralexander\.com\.au\/pyjamas/);
    assert.match(text, /Mug$/);
    assert.equal(/reserved|bought|purchased/i.test(text), false);
    assert.equal(storeNameFromUrl('https://www.example.com/a'), 'example.com');
  });

  it('leaves shop-link autofill on until someone turns it off', () => {
    resetMemoryPrefs();
    const mem = {
      value: '',
      getItem: () => mem.value || null,
      setItem: (_key: string, value: string) => {
        mem.value = value;
      },
    };
    assert.equal(readAppPrefs(mem).autofill, DEFAULT_PREFS.autofill);
    assert.equal(writeAppPrefs({ autofill: false }, mem).autofill, false);
    assert.equal(readAppPrefs(mem).introSeen, false);
    writeAppPrefs({ introSeen: true }, mem);
    assert.equal(readAppPrefs(mem).introSeen, true);
  });
});
