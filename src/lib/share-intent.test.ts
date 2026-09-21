import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  consumePendingShareUrl,
  extractSharedUrl,
  isIncomingSharePath,
  rememberPendingShareUrl,
  urlFromSharePayloads,
} from './share-intent';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('iOS share extension opens Add with the shared URL', () => {
  it('pulls a public URL out of share-sheet text', () => {
    assert.equal(
      extractSharedUrl('https://www.instagram.com/p/Abc123/?igsh=1'),
      'https://www.instagram.com/p/Abc123/?igsh=1',
    );
    assert.equal(
      extractSharedUrl('Look at this https://www.kmart.com.au/product/washed-linen-throw/1.'),
      'https://www.kmart.com.au/product/washed-linen-throw/1',
    );
    assert.equal(extractSharedUrl('not a link'), null);
    assert.equal(extractSharedUrl('https://127.0.0.1/secret'), null);
    assert.equal(
      urlFromSharePayloads([
        { shareType: 'text', value: 'caption only' },
        { shareType: 'url', value: 'https://www.instagram.com/reel/ZZ/' },
      ]),
      'https://www.instagram.com/reel/ZZ/',
    );
    assert.equal(isIncomingSharePath('giftdecider://expo-sharing'), true);
    assert.equal(isIncomingSharePath('expo-sharing'), true);
    assert.equal(isIncomingSharePath('/wishlist'), false);
    assert.equal(isIncomingSharePath('giftdecider://add?url=https%3A%2F%2Fexample.com'), false);
    assert.equal(
      isIncomingSharePath('http://localhost:8081/add?url=https://www.instagram.com/p/Abc123def/'),
      false,
    );

    rememberPendingShareUrl('https://www.instagram.com/p/Abc123/');
    assert.equal(consumePendingShareUrl(), 'https://www.instagram.com/p/Abc123/');
    assert.equal(consumePendingShareUrl(), null);
  });

  it('registers the share extension and routes it to Add', () => {
    const appJson = readFileSync(join(root, '../app.json'), 'utf8');
    const intent = source('app/+native-intent.ts');
    const add = source('app/(app)/add.tsx');
    const layout = source('app/_layout.tsx');
    const plugin = readFileSync(join(root, '../plugins/with-share-display-name.js'), 'utf8');
    const readme = readFileSync(join(root, '../README.md'), 'utf8');

    assert.match(appJson, /expo-sharing/);
    assert.match(appJson, /supportsText/);
    assert.match(appJson, /supportsWebUrlWithMaxCount/);
    assert.match(appJson, /supportsWebPageWithMaxCount/);
    assert.match(appJson, /com\.giftdecider\.app\.ShareExtension/);
    assert.match(appJson, /group\.com\.giftdecider\.app/);
    assert.match(appJson, /text\/plain/);
    assert.match(plugin, /Gift Decider/);
    assert.match(plugin, /CFBundleDisplayName/);
    assert.match(intent, /expo-sharing/);
    assert.match(intent, /\/add\?url=/);
    assert.match(intent, /rememberPendingShareUrl/);
    assert.match(add, /useLocalSearchParams/);
    assert.match(add, /autofillBuyUrl/);
    assert.match(add, /sanitizeBuyUrl/);
    assert.equal(/await autofillFromBuyUrl/.test(add), false);
    assert.match(layout, /takeIncomingShareUrl/);
    assert.match(layout, /rememberPendingShareUrl/);
    assert.match(layout, /isLoading \|\| !!user/);
    assert.match(layout, /pathname === '\/add'/);
    assert.match(source('app/sign-in.tsx'), /peekPendingShareUrl/);
    assert.match(source('app/auth/callback.tsx'), /peekPendingShareUrl/);
    assert.match(source('app/index.tsx'), /peekPendingShareUrl/);
    assert.match(readme, /Share Extension/);
    assert.match(readme, /group\.com\.giftdecider\.app/);
    assert.equal(/graph\.facebook|instagram\.com\/api/i.test(intent + add + layout), false);
  });
});
