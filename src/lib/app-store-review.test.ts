import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { privacyPolicyMarkdown } from '../content/privacy-policy';
import { getDemoItem, resetDemoStore } from './demo-store';
import { resolvePrivacyDestination } from './legal';
import { ownerPreviewItem, ownerPreviewLeaks, shouldSanitizeOwnerPreview } from './owner-preview';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Owner preview never shows giver state', () => {
  it('strips reservations, pledges, funding, and giver names', () => {
    resetDemoStore();
    const spoiled = [
      getDemoItem('demo-socks')!,
      getDemoItem('demo-espresso')!,
      getDemoItem('demo-grinder')!,
      getDemoItem('demo-throw')!,
    ];
    for (const item of spoiled) {
      const preview = ownerPreviewItem(item);
      assert.equal(preview.status, 'available');
      assert.equal(preview.reserved_by, null);
      assert.equal(preview.reserved_at, null);
      assert.equal(preview.is_group_gift, false);
      assert.equal(preview.funded_at, null);
      assert.equal(preview.reveal_at, null);
      assert.equal(preview.organiser_name, null);
      assert.equal(preview.pay_instructions, null);
      assert.equal(preview.pledges, undefined);
      assert.equal(preview.notices, undefined);
      assert.equal(preview.reveal, undefined);
      assert.equal(ownerPreviewLeaks(preview), null);
      assert.equal(JSON.stringify(preview).includes('Sam'), false);
      assert.equal(JSON.stringify(preview).includes('Alex'), false);
    }
  });

  it('sanitizes the preview flag, and a live owner opening their own token', () => {
    assert.equal(
      shouldSanitizeOwnerPreview({
        previewParam: true,
        token: 'demo',
        ownTokens: ['demo'],
        demo: true,
      }),
      true,
    );
    assert.equal(
      shouldSanitizeOwnerPreview({
        previewParam: false,
        token: 'demo',
        ownTokens: ['demo'],
        demo: true,
      }),
      false,
    );
    assert.equal(
      shouldSanitizeOwnerPreview({
        previewParam: false,
        token: 'family',
        ownTokens: ['family', 'birthday'],
        demo: false,
      }),
      true,
    );
    assert.equal(
      shouldSanitizeOwnerPreview({
        previewParam: false,
        token: 'someone-else',
        ownTokens: ['family'],
        demo: false,
      }),
      false,
    );
  });

  it('wires a sanitized preview and hides comments without editing the comments component', () => {
    const preview = source('src/components/preview-giver-link.tsx');
    const list = source('src/app/g/[token]/index.tsx');
    const item = source('src/app/g/[token]/[itemId].tsx');
    const comments = source('src/components/giver-comments.tsx');
    assert.match(preview, /openOwnerPreview/);
    assert.match(list, /ownerPreviewItem/);
    assert.match(list, /readOnly=\{ownerPreview\}/);
    assert.match(item, /ownerPreview \? null : \(/);
    assert.match(item, /GiverComments/);
    assert.equal(comments.includes('ownerPreview'), false);
  });

  it('share-token RPCs and the giver-column trigger hide owner spoilers', () => {
    const sql = source('supabase/migrations/20261009140000_owner_preview_surprise_safe.sql');
    assert.match(sql, /caller_owns_share_token/);
    assert.match(sql, /gift\.status := 'available'/);
    assert.match(sql, /gift\.reserved_by := null/);
    assert.match(sql, /gift\.organiser_name := null/);
    assert.match(sql, /not public\.caller_owns_share_token\(p_token\)/);
    assert.match(sql, /list_shared_item_pledges/);
    assert.match(sql, /list_shared_organiser_notices/);
    assert.match(sql, /List owners cannot change giver activity on their own list/);
    assert.match(sql, /revoke all on function public\.caller_owns_share_token\(text\) from public, anon, authenticated/);
    assert.match(sql, /grant execute on function public\.get_shared_wishlist_items\(text\) to anon, authenticated/);
    assert.match(sql, /item_pledges_reject_owner/);
  });
});

describe('App Store review copy and account deletion', () => {
  it('keeps the drafted policy, including TODO placeholders', () => {
    assert.match(privacyPolicyMarkdown, /# Gift Decider Privacy Policy/);
    assert.match(privacyPolicyMarkdown, /\*\*Effective date:\*\* 9 October 2026/);
    assert.match(privacyPolicyMarkdown, /\[TODO: legal name of the operator/);
    assert.match(privacyPolicyMarkdown, /Delete account/);
    assert.equal(privacyPolicyMarkdown.includes('EDITOR NOTES'), false);
    assert.equal(privacyPolicyMarkdown.includes('operational stub'), false);
    assert.match(source('src/app/privacy.tsx'), /PrivacyPolicyView/);
    assert.equal(source('src/app/privacy.tsx').includes('EXPO_PUBLIC_'), false);
  });

  it('opens a hosted policy URL and never localhost', () => {
    assert.deepEqual(resolvePrivacyDestination(undefined), { type: 'in-app' });
    assert.deepEqual(resolvePrivacyDestination('http://localhost:8081/privacy'), { type: 'in-app' });
    assert.equal(resolvePrivacyDestination('https://example.com/privacy').type, 'external');
    const links = source('src/components/legal-links.tsx');
    assert.match(links, /privacyDestination/);
    assert.match(links, /router\.push\('\/privacy'\)/);
  });

  it('deletes the account in the app through a service-role edge function', () => {
    const settings = source('src/app/(app)/settings.tsx');
    const fn = source('supabase/functions/delete-account/index.ts');
    const config = source('supabase/config.toml');
    assert.match(settings, /Delete account/);
    assert.match(settings, /Type DELETE to confirm/);
    assert.match(settings, /deleteOwnAccount/);
    assert.equal(settings.includes('mailto'), false);
    assert.match(fn, /auth\/v1\/user/);
    assert.match(fn, /wishlist-images/);
    assert.match(fn, /auth\/v1\/admin\/users\//);
    assert.match(fn, /SUPABASE_SERVICE_ROLE_KEY/);
    assert.match(config, /\[functions\.delete-account\]/);
    assert.match(config, /verify_jwt = true/);
  });

  it('drops placeholder sign-in buttons and developer copy on user screens', () => {
    const files = [
      'src/app/sign-in.tsx',
      'src/app/(app)/settings.tsx',
      'src/app/(app)/people.tsx',
      'src/app/(app)/share.tsx',
      'src/components/demo-banner.tsx',
      'src/components/ready-to-buy-banner.tsx',
      'src/app/privacy.tsx',
    ];
    for (const file of files) {
      const text = source(file);
      assert.equal(text.includes('EXPO_PUBLIC_'), false, file);
      assert.equal(text.includes('README'), false, file);
      assert.equal(text.includes('(soon)'), false, file);
      assert.equal(/Invite stubbed|Email stub|mailto stub|Soft launch|operational stub/i.test(text), false, file);
      assert.equal(text.includes('supabase/migrations'), false, file);
    }
    assert.equal(source('src/app/sign-in.tsx').includes('Sign in with Apple'), false);
    assert.equal(source('src/app/sign-in.tsx').includes('Sign in with Google'), false);
    assert.equal(/live Supabase|No Supabase|Supabase project/.test(source('src/components/demo-banner.tsx')), false);
  });

  it('keeps the reply-id fix and its original grants', () => {
    const sql = source('supabase/migrations/20261009130000_fix_reply_ambiguous_id.sql');
    assert.match(sql, /item_giver_comments pc where pc\.id = p_parent_id/);
    assert.match(sql, /grant execute on function public\.post_item_giver_comment\(uuid, text, uuid, uuid\[\]\) to authenticated/);
    assert.match(sql, /revoke all on function public\.post_item_giver_comment\(uuid, text, uuid, uuid\[\]\) from anon, public/);
  });
});
