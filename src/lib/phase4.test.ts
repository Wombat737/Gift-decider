import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { setAnalyticsHandler, track } from './analytics';
import { mateInviteMessage } from './invite';
import { accountDeletionMailto, resolvePrivacyDestination, supportEmail } from './legal';
import { getDemoItem, resetDemoStore } from './demo-store';
import { ownerPayloadLeaksGiftProgress, ownerSafeItem } from './surprise-safe';

describe('Phase 4 soft-launch stubs', () => {
  it('invite copy is mate-ready and includes the share URL', () => {
    const text = mateInviteMessage('https://wombat737.github.io/Gift-decider/g/demo-birthday', 'Birthday');
    assert.match(text, /no spoilers/i);
    assert.match(text, /Birthday/);
    assert.match(text, /Gift-decider\/g\/demo-birthday/);
  });

  it('privacy policy stays in-app unless a public URL is set', () => {
    assert.deepEqual(resolvePrivacyDestination(''), { type: 'in-app' });
    assert.deepEqual(resolvePrivacyDestination('http://localhost:8081/privacy'), { type: 'in-app' });
    assert.deepEqual(resolvePrivacyDestination('http://127.0.0.1:8081/privacy'), { type: 'in-app' });
    assert.deepEqual(resolvePrivacyDestination('https://giftdecider.example/privacy'), {
      type: 'external',
      url: 'https://giftdecider.example/privacy',
    });
  });

  it('account deletion email is only a policy fallback', () => {
    assert.equal(supportEmail().includes('@'), true);
    const mail = accountDeletionMailto();
    assert.match(mail, /^mailto:/);
    assert.match(mail, /deletion/i);
    assert.equal(mail.includes('No automated backend'), false);
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
    const socks = ownerSafeItem(getDemoItem('demo-socks')!);
    const espresso = ownerSafeItem(getDemoItem('demo-espresso')!);
    const grinder = ownerSafeItem(getDemoItem('demo-grinder')!);
    assert.equal(socks.status, 'available');
    assert.equal(socks.reserved_by, null);
    assert.equal(espresso.reveal, undefined);
    assert.ok(grinder.reveal);
    assert.equal(espresso.pay_instructions, null);
    assert.equal(grinder.pay_instructions, null);
    assert.equal(ownerPayloadLeaksGiftProgress(socks), null);
    assert.equal(ownerPayloadLeaksGiftProgress(espresso), null);
    assert.equal(ownerPayloadLeaksGiftProgress(grinder), null);
  });
});
