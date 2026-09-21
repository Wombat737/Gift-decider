import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { applyBuyLinkDraft } from './link-preview';
import {
  WISHLIST_IMAGES_BUCKET,
  dataUrlFromBase64,
  extFromMime,
  isUnsafeImageUri,
  looksLikeImageUri,
  mimeFromExt,
  wishlistImageObjectPath,
} from './item-image';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('Add-item photo preview + Storage upload', () => {
  it('builds owner-scoped Storage paths and safe image URIs', () => {
    const path = wishlistImageObjectPath('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'jpeg');
    assert.match(path, /^a1b2c3d4-e5f6-7890-abcd-ef1234567890\/[a-z0-9-]+\.jpg$/i);
    assert.equal(path.includes('..'), false);
    assert.throws(() => wishlistImageObjectPath('../etc', 'jpg'));
    assert.throws(() => wishlistImageObjectPath('uid/nested', 'png'));
    assert.equal(extFromMime('image/png', null), 'png');
    assert.equal(extFromMime('image/jpeg', 'shot.HEIC'), 'heic');
    assert.equal(extFromMime(null, null), 'jpg');
    assert.equal(mimeFromExt('png'), 'image/png');
    assert.equal(WISHLIST_IMAGES_BUCKET, 'wishlist-images');
    assert.equal(looksLikeImageUri('https://cdn.example/gift.jpg'), true);
    assert.equal(looksLikeImageUri('data:image/jpeg;base64,abc'), true);
    assert.equal(looksLikeImageUri('javascript:alert(1)'), false);
    assert.equal(isUnsafeImageUri('javascript:alert(1)'), true);
    assert.equal(isUnsafeImageUri('https://cdn.example/gift.jpg'), false);
    assert.match(dataUrlFromBase64('abc', 'image/png'), /^data:image\/png;base64,abc$/);
  });

  it('shows a live preview on Add before Pin, and keeps URL paste secondary', () => {
    const fields = source('components/item-fields.tsx');
    const photo = source('components/photo-field.tsx');
    const preview = source('components/gift-photo.tsx');
    const add = source('app/(app)/add.tsx');
    const item = source('app/(app)/item/[id].tsx');
    const paste = source('app/(app)/paste.tsx');

    assert.match(fields, /PhotoField/);
    assert.match(fields, /onPhotoBusy/);
    assert.equal(/label="Photo URL"/.test(fields), false);
    assert.match(photo, /Add photo/);
    assert.match(photo, /Take photo/);
    assert.match(photo, /or paste a URL/);
    assert.match(photo, /pickGiftPhoto/);
    assert.match(photo, /uploadGiftPhoto/);
    assert.match(photo, /GiftPhoto/);
    assert.match(preview, /onError/);
    assert.match(preview, /Photo unavailable/);
    assert.equal(/throw /.test(preview), false);
    assert.match(add, /onPhotoBusy/);
    assert.match(add, /photoBusy/);
    assert.match(add, /Pin to wishlist/);
    assert.match(item, /GiftPhoto/);
    assert.match(item, /onPhotoBusy/);
    assert.match(paste, /PhotoField/);
    assert.match(paste, /Pin as wishlist item/);
  });

  it('lets a user replace an autofill photo and never overwrites an upload', () => {
    const draft = {
      title: 'Washed linen throw',
      notes: 'Soft washed linen.',
      imageUrl: 'https://www.kmart.com.au/images/throw.jpg',
    };
    const uploaded =
      'https://xxxx.supabase.co/storage/v1/object/public/wishlist-images/uid/photo.jpg';
    const kept = applyBuyLinkDraft(
      { title: 'Washed linen throw', notes: 'Soft washed linen.', imageUrl: uploaded },
      draft,
      { title: 'Washed linen throw', notes: 'Soft washed linen.', imageUrl: draft.imageUrl },
    );
    assert.equal(kept.imageUrl, undefined);

    const filled = applyBuyLinkDraft({ title: '', notes: '', imageUrl: '' }, draft, {
      title: '',
      notes: '',
      imageUrl: '',
    });
    assert.equal(filled.imageUrl, draft.imageUrl);
  });

  it('wires ImagePicker + public wishlist-images bucket without Meta OAuth or AI match', () => {
    const service = source('services/item-image.ts');
    const appJson = readFileSync(join(root, '../app.json'), 'utf8');
    const migration = readFileSync(
      join(root, '../supabase/migrations/20260921110000_wishlist_images_storage.sql'),
      'utf8',
    );
    const help = source('lib/help.ts');
    const pkg = readFileSync(join(root, '../package.json'), 'utf8');

    assert.match(service, /expo-image-picker/);
    assert.match(service, /launchImageLibraryAsync/);
    assert.match(service, /launchCameraAsync/);
    assert.match(service, /WISHLIST_IMAGES_BUCKET/);
    assert.match(service, /getPublicUrl/);
    assert.match(service, /usesDemoData/);
    assert.equal(/instagram\.com\/api|graph\.facebook|barcode|openai/i.test(service), false);
    assert.match(appJson, /expo-image-picker/);
    assert.match(appJson, /microphonePermission": false/);
    assert.match(migration, /wishlist-images/);
    assert.match(migration, /storage\.foldername\(name\)\)\[1\] = auth\.uid/);
    assert.match(migration, /to public/);
    assert.match(help, /library or camera/);
    assert.equal(/Camera upload is next/.test(help), false);
    assert.match(pkg, /expo-image-picker/);
  });
});
