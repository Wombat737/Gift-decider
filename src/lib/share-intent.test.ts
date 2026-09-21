import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  consumePendingSharePhoto,
  consumePendingShareUrl,
  draftFromSharePayloads,
  extractSharedUrl,
  hasPendingShare,
  imageFromSharePayloads,
  isIncomingSharePath,
  rememberPendingSharePhoto,
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
    assert.equal(
      urlFromSharePayloads([{ shareType: 'url', value: 'https://www.apple.com/shop/buy-mac/macbook-air' }]),
      'https://www.apple.com/shop/buy-mac/macbook-air',
    );
    assert.equal(
      draftFromSharePayloads([
        { shareType: 'image', value: 'file:///shared/screenshot.png', mimeType: 'image/png' },
        { shareType: 'url', value: 'https://www.kmart.com.au/product/washed-linen-throw/' },
      ]).url,
      'https://www.kmart.com.au/product/washed-linen-throw/',
    );
    assert.equal(
      draftFromSharePayloads([
        { shareType: 'image', value: 'file:///shared/screenshot.png', mimeType: 'image/png' },
        { shareType: 'url', value: 'https://www.kmart.com.au/product/washed-linen-throw/' },
      ]).photo,
      null,
    );
    const photo = imageFromSharePayloads([
      { shareType: 'text', value: 'look at this' },
      { shareType: 'image', value: 'file:///var/mobile/Containers/Shared/AppGroup/x/IMG_2048.HEIC', mimeType: 'image/heic' },
    ]);
    assert.equal(photo?.uri, 'file:///var/mobile/Containers/Shared/AppGroup/x/IMG_2048.HEIC');
    assert.equal(photo?.mimeType, 'image/heic');
    assert.equal(photo?.fileName, 'IMG_2048.HEIC');
    assert.equal(
      imageFromSharePayloads([{ shareType: 'image', value: 'content://media/external/images/media/12', mimeType: 'image/jpeg' }])
        ?.uri,
      'content://media/external/images/media/12',
    );
    assert.equal(imageFromSharePayloads([{ shareType: 'image', value: 'https://shop.example/product/1' }]), null);
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

    rememberPendingSharePhoto({
      uri: 'file:///shared/shot.png',
      mimeType: 'image/png',
      fileName: 'shot.png',
    });
    assert.equal(hasPendingShare(), true);
    assert.equal(consumePendingShareUrl(), null);
    assert.equal(consumePendingSharePhoto()?.uri, 'file:///shared/shot.png');
    assert.equal(hasPendingShare(), false);
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
    assert.match(appJson, /supportsImageWithMaxCount/);
    assert.match(appJson, /image\/\*/);
    assert.match(appJson, /com\.giftdecider\.app\.ShareExtension/);
    assert.match(appJson, /group\.com\.giftdecider\.app/);
    assert.match(appJson, /text\/plain/);
    assert.equal(/public\.instagram|com\.burbn/i.test(appJson), false);
    assert.match(plugin, /Gift Decider/);
    assert.match(plugin, /CFBundleDisplayName/);
    assert.match(plugin, /Sync Share Extension Version/);
    assert.match(plugin, /CFBundleVersion/);
    assert.match(plugin, /ENABLE_USER_SCRIPT_SANDBOXING/);
    assert.match(plugin, /ExpoShareIntoAppGroupId/);
    const payload = source('lib/read-share-payload.ts');
    assert.equal(/^import .+ from 'expo-sharing'/m.test(intent), false);
    assert.equal(/^import .+ from 'expo-sharing'/m.test(payload), false);
    assert.match(payload, /require\('expo-sharing'\)/);
    assert.match(payload, /rememberPendingShareUrl/);
    assert.match(payload, /rememberPendingSharePhoto/);
    assert.match(intent, /isIncomingSharePath/);
    assert.match(intent, /stashNativeShare/);
    assert.match(intent, /\/add\?url=/);
    assert.match(intent, /\/add\?photo=1/);
    assert.match(add, /useLocalSearchParams/);
    assert.match(add, /autofillBuyUrl/);
    assert.match(add, /sanitizeBuyUrl/);
    assert.match(add, /consumePendingSharePhoto/);
    assert.match(add, /params\.photo/);
    assert.equal(/await autofillFromBuyUrl/.test(add), false);
    assert.match(layout, /stashNativeShare/);
    assert.match(layout, /isIncomingSharePath/);
    assert.match(layout, /Linking\.getInitialURL/);
    assert.equal(/\bAppState\b/.test(layout), false);
    assert.match(layout, /rememberPendingShareUrl/);
    assert.match(layout, /isLoading \|\| !!user/);
    assert.match(layout, /pathname === '\/add'/);
    assert.match(layout, /photo: '1'/);
    assert.match(source('app/sign-in.tsx'), /hasPendingShare/);
    assert.match(source('app/auth/callback.tsx'), /hasPendingShare/);
    assert.match(source('app/index.tsx'), /peekPendingShareUrl/);
    assert.match(source('app/index.tsx'), /peekPendingSharePhoto/);
    assert.match(source('components/photo-field.tsx'), /sharedPhoto/);
    assert.match(source('components/photo-field.tsx'), /uploadGiftPhoto/);
    assert.match(readme, /Share Extension/);
    assert.match(readme, /group\.com\.giftdecider\.app/);
    assert.equal(/graph\.facebook|instagram\.com\/api/i.test(intent + add + layout), false);
  });
});
