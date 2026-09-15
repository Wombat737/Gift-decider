import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { webAuthRedirectTo } from './auth-redirect';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

describe('Vercel web deploy (root path)', () => {
  it('exports Expo web to dist and rewrites SPA routes to the app', () => {
    const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8')) as {
      buildCommand?: string;
      outputDirectory?: string;
      framework?: string | null;
      rewrites?: { source: string; destination: string }[];
    };

    assert.match(String(vercel.buildCommand), /npx expo export -p web/);
    assert.match(String(vercel.buildCommand), /EXPO_BASE_URL=/);
    assert.doesNotMatch(String(vercel.buildCommand), /Gift-decider/);
    assert.equal(vercel.outputDirectory, 'dist');
    assert.equal(vercel.framework, null);
    assert.ok(vercel.rewrites?.some((rule) => rule.destination === '/' || rule.destination === '/index.html'));
  });

  it('keeps GitHub Pages on the /Gift-decider subpath without Supabase secrets', () => {
    const workflow = readFileSync(join(root, '.github/workflows/deploy-web-demo.yml'), 'utf8');
    assert.match(workflow, /EXPO_BASE_URL:\s*\/Gift-decider/);
    assert.doesNotMatch(workflow, /EXPO_PUBLIC_SUPABASE/);
  });

  it('magic-link redirect on Vercel is origin + /auth/callback (no Pages prefix)', () => {
    assert.equal(
      webAuthRedirectTo('https://gift-decider.vercel.app'),
      'https://gift-decider.vercel.app/auth/callback',
    );
  });
});
