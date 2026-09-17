import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDemoItem, resetDemoStore } from './demo-store';
import { asRevealDate, formatRevealDate, localDateISO, readyToBuyEmailPreview } from './pledges';
import { ownerPayloadLeaksGiftProgress, ownerSafeItem } from './surprise-safe';

describe('AU reveal date display (dd/mm/yyyy)', () => {
  it('formats ISO calendar dates as zero-padded dd/mm/yyyy without locale APIs', () => {
    assert.equal(formatRevealDate('2026-09-17'), '17/09/2026');
    assert.equal(formatRevealDate('2026-01-05'), '05/01/2026');
    assert.equal(formatRevealDate('2026-12-31T00:00:00.000Z'), '31/12/2026');
    assert.equal(formatRevealDate(null), 'the reveal date');
    assert.equal(formatRevealDate(''), 'the reveal date');
    assert.equal(formatRevealDate('not-a-date'), 'the reveal date');
  });

  it('keeps storage and comparisons on YYYY-MM-DD', () => {
    assert.equal(asRevealDate('2026-09-17'), '2026-09-17');
    assert.equal(asRevealDate('17/09/2026'), null);
    assert.equal(localDateISO(new Date(2026, 8, 17)), '2026-09-17');
    assert.notEqual(formatRevealDate('2026-09-17'), '2026-09-17');
    assert.notEqual(formatRevealDate('2026-09-17'), '09/17/2026');
  });

  it('ready-to-buy email copy uses AU display, not ISO or US month-first', () => {
    resetDemoStore();
    const espresso = getDemoItem('demo-espresso')!;
    assert.ok(espresso.reveal_at);
    assert.match(espresso.reveal_at, /^\d{4}-\d{2}-\d{2}$/);
    const preview = readyToBuyEmailPreview(espresso);
    const au = formatRevealDate(espresso.reveal_at);
    assert.match(au, /^\d{2}\/\d{2}\/\d{4}$/);
    assert.match(preview.text, new RegExp(`on ${au} — not today`));
    assert.equal(preview.text.includes(espresso.reveal_at), false);
    assert.equal(preview.text.includes('09/17/'), false);
  });

  it('does not change surprise-safe owner payloads or Coral Coast surfaces', () => {
    resetDemoStore();
    const espresso = ownerSafeItem(getDemoItem('demo-espresso')!);
    const grinder = ownerSafeItem(getDemoItem('demo-grinder')!);
    assert.equal(espresso.reveal_at, null);
    assert.equal(espresso.reveal, undefined);
    assert.equal(ownerPayloadLeaksGiftProgress(espresso), null);
    assert.ok(grinder.reveal);
    assert.match(grinder.reveal.reveal_at ?? '', /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(formatRevealDate(grinder.reveal.reveal_at), formatRevealDate(getDemoItem('demo-grinder')!.reveal_at));
  });
});
