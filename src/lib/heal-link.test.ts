import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';

import { getDemoItem, resetDemoStore } from './demo-store';
import {
  HEAL_BADGE,
  healBadgeLabel,
  healLink,
  healLinkAsync,
  shouldRenderHealUi,
  shouldShowHealAlternatives,
} from './heal-link';
import { inspectBuyLink, isMalformedBuyUrl, looksLikeDeadStubUrl } from './link-health';
import { ownerPayloadLeaksGiftProgress, ownerSafeItem } from './surprise-safe';
import { suggestSubstitutes } from './substitutes';

describe('Dead-link heal — giver-only stub', () => {
  beforeEach(() => {
    resetDemoStore();
  });

  it('demo broken link surfaces heal for givers with AU alternatives', () => {
    const giver = getDemoItem('demo-throw');
    assert.ok(giver);
    assert.match(giver.buy_url ?? '', /broken-buy-link/);
    assert.equal(looksLikeDeadStubUrl(giver.buy_url), true);
    assert.equal(inspectBuyLink(giver), 'dead');
    assert.equal(healBadgeLabel('giver', giver), HEAL_BADGE);
    assert.equal(shouldRenderHealUi('giver', giver), true);
    assert.equal(shouldShowHealAlternatives('giver', giver), true);

    const result = healLink(giver);
    assert.equal(result.health, 'dead');
    assert.equal(result.source, 'stub');
    assert.equal(result.allowsSubstitutes, true);
    assert.ok(result.alternatives.length >= 1 && result.alternatives.length <= 3);
    assert.ok(result.alternatives.every((row) => row.title && row.merchant && row.buyUrl));
    assert.ok(result.alternatives.some((row) => /Amazon AU|Kmart|Target AU/.test(row.merchant)));
    assert.ok(result.alternatives.some((row) => /throw|linen|cotton/i.test(row.title)));
    assert.ok(result.alternatives.every((row) => /^https:\/\//.test(row.buyUrl)));
    assert.match(result.copy, /Link may be broken/);
  });

  it('owner never sees heal UI, even when the buy URL is the demo dead stub', () => {
    const giver = getDemoItem('demo-throw');
    assert.ok(giver);
    assert.equal(inspectBuyLink(giver), 'dead');

    assert.equal(shouldRenderHealUi('owner', giver), false);
    assert.equal(shouldShowHealAlternatives('owner', giver), false);
    assert.equal(healBadgeLabel('owner', giver), null);

    const owner = ownerSafeItem(giver);
    assert.equal(owner.buy_url_dead, false);
    assert.equal(shouldRenderHealUi('owner', owner), false);
    assert.equal(healBadgeLabel('owner', owner), null);
    assert.equal(shouldShowHealAlternatives('owner', owner), false);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);
    assert.equal(JSON.stringify(owner).includes(HEAL_BADGE), false);
    assert.equal(JSON.stringify(owner).includes('See alternatives'), false);
  });

  it('no_substitution blocks substitutes and only flags the broken link', () => {
    const mug = getDemoItem('demo-mug');
    assert.ok(mug);
    assert.equal(mug.no_substitution, true);
    assert.equal(suggestSubstitutes(mug).length, 0);

    const deadMug = { ...mug, buy_url_dead: true, buy_url: 'https://example.com/broken-buy-link/mug' };
    assert.equal(inspectBuyLink(deadMug), 'dead');
    assert.equal(healBadgeLabel('giver', deadMug), HEAL_BADGE);
    assert.equal(shouldShowHealAlternatives('giver', deadMug), false);

    const result = healLink(deadMug);
    assert.equal(result.health, 'dead');
    assert.equal(result.allowsSubstitutes, false);
    assert.equal(result.alternatives.length, 0);
    assert.match(result.copy, /locked/i);

    assert.equal(healBadgeLabel('owner', deadMug), null);
    assert.equal(shouldShowHealAlternatives('owner', deadMug), false);
  });

  it('malformed and empty URLs are distinct; only broken URLs get the heal badge', () => {
    const throwItem = getDemoItem('demo-throw')!;
    assert.equal(isMalformedBuyUrl('not-a-url'), true);
    assert.equal(isMalformedBuyUrl('https://www.kmart.com.au/product/throw'), false);

    const malformed = healLink({ ...throwItem, buy_url: 'not a url', buy_url_dead: false, no_substitution: false });
    assert.equal(malformed.health, 'dead');
    assert.equal(healBadgeLabel('giver', { ...throwItem, buy_url: 'not a url', buy_url_dead: false }), HEAL_BADGE);

    const missing = healLink({ ...throwItem, buy_url: '', buy_url_dead: false });
    assert.equal(missing.health, 'missing');
    assert.equal(healBadgeLabel('giver', { ...throwItem, buy_url: null, buy_url_dead: false }), null);
  });

  it('healLinkAsync LLM slot can fill alternatives later without changing the contract', async () => {
    const obscure = {
      id: 'demo-obscure',
      title: 'Obscure widget xyz',
      notes: null,
      tags: ['unique-tag-xyz'],
      buy_url: 'https://example.com/broken-buy-link/widget',
      buy_url_dead: true,
      no_substitution: false,
      item_kind: 'vibe' as const,
    };
    const stub = healLink(obscure);
    assert.ok(stub.alternatives.length >= 1 && stub.alternatives.length < 3);

    const withLlm = await healLinkAsync(obscure, {
      llm: async () => [
        {
          id: 'llm-1',
          title: 'Cast-iron hardy fern',
          merchant: 'Kmart',
          buyUrl: 'https://www.kmart.com.au/search/?q=hardy%20fern',
          reason: 'Future LLM plug-in.',
        },
      ],
    });
    assert.equal(withLlm.source, 'llm');
    assert.ok(withLlm.alternatives.some((row) => row.title === 'Cast-iron hardy fern'));

    const locked = await healLinkAsync(
      { ...getDemoItem('demo-mug')!, buy_url_dead: true },
      {
        llm: async () => [
          {
            id: 'should-not-appear',
            title: 'A different mug',
            merchant: 'Amazon AU',
            buyUrl: 'https://www.amazon.com.au/s?k=mug',
            reason: 'Must be ignored.',
          },
        ],
      },
    );
    assert.equal(locked.alternatives.length, 0);
    assert.equal(locked.source, 'stub');
  });
});
