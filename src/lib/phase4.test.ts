import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setAnalyticsHandler, track } from './analytics';
import { mateInviteMessage } from './invite';
import { accountDeletionMailto, privacyPolicyUrl, supportEmail } from './legal';
import { getDemoItem, resetDemoStore } from './demo-store';
import { ownerPayloadLeaksGiftProgress, ownerSafeItem } from './surprise-safe';

describe('Phase 4 soft-launch stubs', () => {
  it('invite copy is mate-ready and includes the share URL', () => {
    const text = mateInviteMessage('https://wombat737.github.io/Gift-decider/g/demo-birthday', 'Birthday');
    assert.match(text, /no spoilers/i);
    assert.match(text, /Birthday/);
    assert.match(text, /Gift-decider\/g\/demo-birthday/);
  });

  it('privacy policy falls back to the in-app /privacy route', () => {
    assert.equal(privacyPolicyUrl().endsWith('/privacy'), true);
  });

  it('account deletion is a mailto stub', () => {
    assert.equal(supportEmail().includes('@'), true);
    const mail = accountDeletionMailto();
    assert.match(mail, /^mailto:/);
    assert.match(mail, /deletion/i);
  });

  it('analytics stub does not throw without a paid product', () => {
    const seen: string[] = [];
    setAnalyticsHandler((event) => {
      seen.push(event);
    });
    track('demo_explore', { surface: 'test' });
    assert.deepEqual(seen, ['demo_explore']);
    setAnalyticsHandler(null);
    track('demo_explore');
  });

  it('owner payloads stay surprise-safe after polish', () => {
    resetDemoStore();
    const owner = ownerSafeItem(getDemoItem('demo-socks')!);
    assert.equal(owner.status, 'available');
    assert.equal(owner.reserved_by, null);
    assert.equal(ownerPayloadLeaksGiftProgress(owner), null);
  });
});
