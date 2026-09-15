import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { resolveSupabaseConfig } from './env';
import { shouldUseDemoData } from './demo-session';
import { webAuthRedirectTo } from './auth-redirect';

describe('Live vs Explore-demo switch', () => {
  it('stays in demo when URL and anon key are missing or placeholders', () => {
    const empty = resolveSupabaseConfig({});
    assert.equal(empty.isSupabaseConfigured, false);

    const placeholders = resolveSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://YOUR_PROJECT_REF.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',
    });
    assert.equal(placeholders.isSupabaseConfigured, false);
  });

  it('turns live when EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY are set', () => {
    const live = resolveSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://abcdxyzproject.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.anon-test-key-value',
    });
    assert.equal(live.isSupabaseConfigured, true);
    assert.equal(live.supabaseUrl, 'https://abcdxyzproject.supabase.co');
    assert.match(live.supabaseAnonKey, /anon-test-key/);
  });

  it('accepts EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY as an alias', () => {
    const live = resolveSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_anon_key_value',
    });
    assert.equal(live.isSupabaseConfigured, true);
    assert.equal(live.supabaseAnonKey, 'sb_publishable_local_anon_key_value');
  });

  it('prefers ANON_KEY when both keys are present', () => {
    const live = resolveSupabaseConfig({
      EXPO_PUBLIC_SUPABASE_URL: 'https://abcdxyzproject.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.preferred-anon',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy-publishable',
    });
    assert.match(live.supabaseAnonKey, /preferred-anon/);
  });

  it('Explore demo still wins when a live project is configured', () => {
    assert.equal(shouldUseDemoData({ supabaseConfigured: true, demoSession: true }), true);
    assert.equal(shouldUseDemoData({ supabaseConfigured: true, demoSession: false }), false);
    assert.equal(shouldUseDemoData({ supabaseConfigured: false, demoSession: false }), true);
  });

  it('web magic-link redirect lands on /auth/callback including a Pages prefix', () => {
    assert.equal(webAuthRedirectTo('http://localhost:8081'), 'http://localhost:8081/auth/callback');
    assert.equal(
      webAuthRedirectTo('https://wombat737.github.io/Gift-decider'),
      'https://wombat737.github.io/Gift-decider/auth/callback',
    );
  });

  it('reads EXPO_PUBLIC_* as static process.env members so expo export inlines them', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'env.ts'), 'utf8');
    assert.match(src, /process\.env\.EXPO_PUBLIC_SUPABASE_URL/);
    assert.match(src, /process\.env\.EXPO_PUBLIC_SUPABASE_ANON_KEY/);
    assert.match(src, /process\.env\.EXPO_PUBLIC_APP_URL/);
  });
});
