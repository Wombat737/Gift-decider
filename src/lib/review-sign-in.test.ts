import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { REVIEW_SIGN_IN_EMAILS, reviewSignInEmail } from './review-sign-in';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Review password sign-in allow-list', () => {
  it('keeps the two review emails in one constant', () => {
    assert.deepEqual([...REVIEW_SIGN_IN_EMAILS], ['review@meantvo.app', 'giver-review@meantvo.app']);
    const file = source('lib/review-sign-in.ts');
    const listed = [...file.matchAll(/'([^']+@[^']+)'/g)].map((match) => match[1]);
    assert.deepEqual(listed, ['review@meantvo.app', 'giver-review@meantvo.app']);
  });

  it('matches only those addresses, ignoring case and surrounding space', () => {
    assert.equal(reviewSignInEmail('review@meantvo.app'), 'review@meantvo.app');
    assert.equal(reviewSignInEmail('  Giver-Review@Meantvo.app '), 'giver-review@meantvo.app');
    assert.equal(reviewSignInEmail('Review@Meantvo.app'), 'review@meantvo.app');
    assert.equal(reviewSignInEmail('you@example.com'), null);
    assert.equal(reviewSignInEmail('review@meantvo.app.evil'), null);
    assert.equal(reviewSignInEmail('not-review@meantvo.app'), null);
    assert.equal(reviewSignInEmail('review@meantvo.com'), null);
    assert.equal(reviewSignInEmail('giver@meantvo.app'), null);
    assert.equal(reviewSignInEmail(''), null);
    assert.equal(reviewSignInEmail('   '), null);
  });

  it('shows a password field only for an allow-listed email and leaves the magic link in place', () => {
    const screen = source('app/sign-in.tsx');
    assert.match(screen, /reviewSignInEmail\(email\)/);
    assert.match(screen, /reviewEmail \? \(/);
    assert.match(screen, /secureTextEntry/);
    assert.match(screen, /signInWithPassword\(email, password\)/);
    assert.match(screen, /reviewEmail \? onPassword\(\) : onMagicLink\(\)/);
    assert.match(screen, /Email me a magic link/);
    assert.match(screen, /signInWithMagicLink\(email\)/);
    assert.equal(screen.includes('review@meantvo.app'), false);
    assert.equal(screen.includes('giver-review@meantvo.app'), false);
    assert.equal(screen.includes('Sign in with Apple'), false);
    assert.equal(screen.includes('Sign in with Google'), false);
  });

  it('password sign-in is gated in the auth client and does not replace magic-link, deep-link, or session handling', () => {
    const auth = source('context/auth-context.tsx');
    assert.match(auth, /reviewSignInEmail\(email\)/);
    assert.match(auth, /supabase\.auth\.signInWithPassword\(\{/);
    assert.equal(auth.includes('review@meantvo.app'), false);
    assert.match(auth, /signInWithOtp\(\{/);
    assert.match(auth, /shouldCreateUser: true/);
    assert.match(auth, /emailRedirectTo: redirectTo/);
    assert.match(auth, /Linking\.createURL\('auth\/callback'\)/);
    assert.match(auth, /completeAuthFromUrl/);
    assert.match(auth, /onAuthStateChange/);
    assert.match(auth, /supabase\.auth\.getSession\(\)/);
    assert.match(auth, /supabase\.auth\.signOut\(\)/);

    const redirect = source('lib/auth-redirect.ts');
    assert.match(redirect, /exchangeCodeForSession/);
    assert.equal(redirect.includes('signInWithPassword'), false);

    const deletion = source('services/account.ts');
    assert.match(deletion, /functions\.invoke\('delete-account'/);
    assert.equal(deletion.includes('signInWithPassword'), false);
  });
});
