import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { completeAuthFromUrl, paramsFromAuthUrl } from './auth-redirect';

describe('Magic-link redirect parsing', () => {
  it('reads PKCE code from query', () => {
    const params = paramsFromAuthUrl('giftdecider://auth/callback?code=abc123&type=magiclink');
    assert.equal(params.get('code'), 'abc123');
  });

  it('reads implicit tokens from the hash', () => {
    const params = paramsFromAuthUrl(
      'http://localhost:8081/auth/callback#access_token=tok&refresh_token=ref&token_type=bearer',
    );
    assert.equal(params.get('access_token'), 'tok');
    assert.equal(params.get('refresh_token'), 'ref');
  });

  it('reads Expo Go deep-link query after /--/', () => {
    const params = paramsFromAuthUrl('exp://127.0.0.1:8081/--/auth/callback?code=pkce-one');
    assert.equal(params.get('code'), 'pkce-one');
  });

  it('exchanges a PKCE code via the Supabase client', async () => {
    const calls: string[] = [];
    const client = {
      auth: {
        async exchangeCodeForSession(code: string) {
          calls.push(code);
          return { error: null };
        },
        async setSession() {
          throw new Error('should not setSession for PKCE');
        },
      },
    };
    const url = 'giftdecider://auth/callback?code=from-email';
    const first = await completeAuthFromUrl(url, client as never);
    const second = await completeAuthFromUrl(url, client as never);
    assert.equal(first, 'pkce');
    assert.equal(second, 'pkce');
    assert.deepEqual(calls, ['from-email']);
  });

  it('surfaces provider errors from the redirect', async () => {
    await assert.rejects(
      () => completeAuthFromUrl('giftdecider://auth/callback?error=access_denied', { auth: {} } as never),
      /access_denied/,
    );
  });
});

describe('heal-link Edge Function stub stays keyless', () => {
  it('returns the probe contract without calling an LLM', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
    const src = readFileSync(join(root, 'supabase/functions/heal-link/index.ts'), 'utf8');
    assert.match(src, /health/);
    assert.match(src, /alternatives/);
    assert.equal(/OPENAI_API_KEY/.test(src), false);
  });
});
