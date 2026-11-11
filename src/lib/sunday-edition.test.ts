import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SundayEdition } from '../constants/coral-coast';
import { coverMark, nextCoverOverride, resolveCoverTreatment } from './cover';
import { daysUntil, headlineRuns, headlineSuggestions, issueKicker, occasionKind, plainHeadline } from './headlines';
import { listAsPlainText, storeNameFromUrl } from './list-text';
import { DEFAULT_PREFS, readAppPrefs, resetMemoryPrefs, writeAppPrefs } from './preferences';
import { resizeAction } from './prepare-photo';

describe('Sunday Edition palette', () => {
  it('locks the paper, card, rule, stone, muted, ink, and oxblood set', () => {
    assert.equal(SundayEdition.paper, '#F3EFE6');
    assert.equal(SundayEdition.card, '#FBF9F4');
    assert.equal(SundayEdition.rule, '#D9D2C4');
    assert.equal(SundayEdition.stone, '#E4DCCC');
    assert.equal(SundayEdition.muted, '#6B645B');
    assert.equal(SundayEdition.ink, '#1A1714');
    assert.equal(SundayEdition.oxblood, '#7A1F2B');
  });
});

describe('Cover fallback', () => {
  it('uses a letter with no photo, a print when the photo is weak, and full bleed otherwise', () => {
    assert.equal(resolveCoverTreatment({ imageUrl: '' }), 'monogram');
    assert.equal(resolveCoverTreatment({ imageUrl: 'https://cdn.example/a.jpg', width: 320, height: 240 }), 'print');
    assert.equal(resolveCoverTreatment({ imageUrl: 'https://cdn.example/a.jpg', width: 1600, height: 1200 }), 'full');
    assert.equal(resolveCoverTreatment({ imageUrl: 'https://cdn.example/a.jpg', width: 200, height: 200, override: 'full' }), 'full');
    assert.equal(coverMark('Birthday'), 'B');
    assert.equal(coverMark('40th'), '4');
    assert.equal(nextCoverOverride('auto'), 'full');
    assert.equal(nextCoverOverride('monogram'), 'auto');
  });
});

describe('Headline voice', () => {
  it('suggests a few lines and never treats them as published', () => {
    assert.equal(occasionKind('Birthday'), 'birthday');
    assert.equal(occasionKind('Housewarming'), 'housewarming');
    const forty = headlineSuggestions('The 40th');
    assert.equal(forty[0]?.text, 'The big *four-oh*');
    assert.equal(plainHeadline('The big *four-oh*'), 'The big four-oh');
    assert.deepEqual(headlineRuns('The big *four-oh*'), [
      { text: 'The big ', emphasis: false },
      { text: 'four-oh', emphasis: true },
    ]);
    const general = headlineSuggestions('Saturday');
    assert.equal(general.length >= 3, true);
    assert.equal(JSON.stringify(general).toLowerCase().includes('damn'), false);
  });

  it('builds a kicker with a day count when a date is set', () => {
    const today = new Date(2026, 10, 11);
    assert.equal(daysUntil('2026-12-25', today), 44);
    assert.equal(issueKicker('Birthday', null, '2026-12-25', today), 'BIRTHDAY · 44 DAYS');
    assert.equal(issueKicker('Birthday', 'The big *day*', '2026-12-25', today), 'THE BIG DAY · 44 DAYS');
  });
});

describe('Copy as text', () => {
  it('lists name, price, store, and link and has no room for reservation status', () => {
    const text = listAsPlainText('Birthday', [
      { title: 'Pyjamas', target_amount: 49, buy_url: 'https://www.peteralexander.com.au/pyjamas' },
      { title: 'Mug', target_amount: null, buy_url: null },
    ]);
    assert.match(text, /^Birthday\n\nPyjamas\n\$49\npeteralexander\.com\.au\nhttps:\/\/www\.peteralexander\.com\.au\/pyjamas/);
    assert.match(text, /Mug$/);
    assert.equal(/reserved|bought|purchased/i.test(text), false);
    assert.equal(storeNameFromUrl('https://www.example.com/a'), 'example.com');
  });
});

describe('Preferences', () => {
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
    assert.equal(readAppPrefs(mem).autofill, true);
    assert.equal(writeAppPrefs({ autofill: false }, mem).autofill, false);
    assert.equal(readAppPrefs(mem).introSeen, false);
    writeAppPrefs({ introSeen: true }, mem);
    assert.equal(readAppPrefs(mem).introSeen, true);
  });
});

describe('Photo resize', () => {
  it('shrinks a full-resolution photo and leaves a small one alone', () => {
    assert.deepEqual(resizeAction(4032, 3024), { resize: { width: 1600 } });
    assert.deepEqual(resizeAction(1200, 3000), { resize: { height: 1600 } });
    assert.equal(resizeAction(800, 800), null);
    assert.equal(resizeAction(0, 0), null);
  });
});
