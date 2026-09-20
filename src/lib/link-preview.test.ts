import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BUY_LINK_AUTOFILL_FAIL,
  applyBuyLinkDraft,
  autofillHint,
  draftFromPreview,
  isBlockedPreviewHost,
  isInstagramHost,
  lightNotes,
  looksLikeCompleteBuyUrl,
  parseHtmlPreview,
  previewLooksLikeStub,
  previewProviderForHost,
  sanitizeBuyUrl,
  sanitizeImageUrl,
  tidyPreviewTitle,
  titleFromBuyUrl,
} from './link-preview';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

const kmartHtml = `
<html>
  <head>
    <meta property="og:title" content="Washed linen throw" />
    <meta property="og:image" content="/images/throw.jpg" />
    <meta name="description" content="Soft washed linen for the couch. 130x180cm." />
    <title>Washed linen throw | Kmart</title>
  </head>
</html>
`;

const amazonHtml = `
<html>
  <head>
    <meta property="og:title" content="Speckled ceramic mug : Amazon.com.au" />
    <meta property="og:image" content="https://m.media-amazon.com/images/I/mug.jpg" />
    <meta property="og:description" content="A sturdy speckled mug for morning tea." />
    <script type="application/ld+json">
      {"@type":"Product","name":"Speckled ceramic mug","image":"https://m.media-amazon.com/images/I/mug-ld.jpg"}
    </script>
  </head>
</html>
`;

describe('Buy-link autofill', () => {
  it('sanitizes public http(s) URLs and rejects private / login-ish schemes', () => {
    assert.equal(sanitizeBuyUrl(' https://www.kmart.com.au/product/throw/1 '), 'https://www.kmart.com.au/product/throw/1');
    assert.equal(sanitizeBuyUrl('www.target.com.au/p/mug'), 'https://www.target.com.au/p/mug');
    assert.equal(sanitizeBuyUrl('javascript:alert(1)'), null);
    assert.equal(sanitizeBuyUrl('data:text/html,hi'), null);
    assert.equal(sanitizeBuyUrl('https://localhost/secret'), null);
    assert.equal(sanitizeBuyUrl('https://127.0.0.1/x'), null);
    assert.equal(sanitizeBuyUrl('https://192.168.1.9/item'), null);
    assert.equal(sanitizeBuyUrl('https://169.254.169.254/latest/meta-data'), null);
    assert.equal(sanitizeBuyUrl('https://user:pass@kmart.com.au/p'), null);
    assert.equal(looksLikeCompleteBuyUrl('https://www.amazon.com.au/dp/B00TEST'), true);
    assert.equal(looksLikeCompleteBuyUrl('not a url'), false);
    assert.equal(isBlockedPreviewHost('10.0.0.4'), true);
    assert.equal(isBlockedPreviewHost('kmart.com.au'), false);
  });

  it('parses Open Graph, twitter, and JSON-LD Product tags', () => {
    const kmart = parseHtmlPreview(kmartHtml, 'https://www.kmart.com.au/product/washed-linen-throw/123');
    assert.equal(kmart.title, 'Washed linen throw');
    assert.equal(kmart.imageUrl, 'https://www.kmart.com.au/images/throw.jpg');
    assert.match(kmart.notes ?? '', /Soft washed linen/);

    const amazon = parseHtmlPreview(amazonHtml, 'https://www.amazon.com.au/dp/B00TEST');
    assert.equal(amazon.title, 'Speckled ceramic mug');
    assert.equal(amazon.imageUrl, 'https://m.media-amazon.com/images/I/mug.jpg');
    assert.match(amazon.notes ?? '', /morning tea/);
  });

  it('fills empty fields but does not overwrite a user’s edits', () => {
    const draft = {
      title: 'Washed linen throw',
      notes: 'Soft washed linen.',
      imageUrl: 'https://www.kmart.com.au/images/throw.jpg',
    };
    const empty = applyBuyLinkDraft({ title: '', notes: '', imageUrl: '' }, draft, {
      title: '',
      notes: '',
      imageUrl: '',
    });
    assert.deepEqual(empty, draft);

    const kept = applyBuyLinkDraft(
      { title: 'Mum’s throw', notes: 'Navy, king', imageUrl: 'https://example.com/mine.jpg' },
      draft,
      { title: '', notes: '', imageUrl: '' },
    );
    assert.deepEqual(kept, {});

    const replacePrevious = applyBuyLinkDraft(
      { title: 'Old draft title', notes: '', imageUrl: '' },
      draft,
      { title: 'Old draft title', notes: '', imageUrl: '' },
    );
    assert.equal(replacePrevious.title, 'Washed linen throw');
  });

  it('never treats the old preview stub as a real photo', () => {
    assert.equal(previewLooksLikeStub({ stub: true, title: 'Preview of kmart.com.au' }), true);
    assert.equal(
      previewLooksLikeStub({
        stub: false,
        title: 'Preview of amazon.com.au',
        image_url: 'https://picsum.photos/seed/amazon/800/800',
      }),
      true,
    );
    assert.deepEqual(
      draftFromPreview({
        stub: true,
        url: 'https://www.kmart.com.au/product/throw/1',
        title: 'Preview of kmart.com.au',
        image_url: 'https://picsum.photos/seed/kmart/800/800',
      }),
      { title: null, notes: null, imageUrl: null },
    );
    assert.equal(sanitizeImageUrl('https://picsum.photos/seed/gift/800/800'), null);
    assert.equal(autofillHint({ title: 'Throw', notes: null, imageUrl: null }), BUY_LINK_AUTOFILL_FAIL);
    assert.equal(
      autofillHint({ title: 'Throw', notes: null, imageUrl: 'https://www.kmart.com.au/images/throw.jpg' }),
      null,
    );
  });

  it('prefers AU hosts and can guess a light title from a shop path when fetch is offline', () => {
    assert.equal(previewProviderForHost('www.amazon.com.au'), 'amazon-au');
    assert.equal(previewProviderForHost('www.kmart.com.au'), 'kmart');
    assert.equal(previewProviderForHost('www.target.com.au'), 'target-au');
    assert.equal(titleFromBuyUrl('https://www.kmart.com.au/product/washed-linen-throw/12345'), 'Washed Linen Throw');
    assert.equal(titleFromBuyUrl('https://www.amazon.com.au/dp/B00ASINONLY'), null);
    assert.equal(tidyPreviewTitle('Amazon.com.au : Linen apron'), 'Linen apron');
    assert.equal(isInstagramHost('www.instagram.com'), true);
    assert.equal(isInstagramHost('kmart.com.au'), false);
    assert.match(lightNotes('A'.repeat(220)) ?? '', /…$/);
  });

  it('wires paste/blur autofill on Add item without blocking Pin or scraping Instagram', () => {
    const fields = source('components/item-fields.tsx');
    const add = source('app/(app)/add.tsx');
    const preview = source('services/preview.ts');
    const edge = readFileSync(join(root, '../supabase/functions/preview-url/index.ts'), 'utf8');
    const help = source('lib/help.ts');

    assert.match(fields, /autofillFromBuyUrl/);
    assert.match(fields, /onBlur/);
    assert.match(fields, /BUY_LINK_AUTOFILL_FAIL|Couldn’t grab a photo/);
    assert.match(fields, /previewing/);
    assert.match(add, /Pin to wishlist/);
    assert.equal(/await autofillFromBuyUrl/.test(add), false);
    assert.match(preview, /preview-url/);
    assert.match(preview, /draftFromPreview/);
    assert.equal(/Sample Instagram gift/.test(preview), false);
    assert.equal(/picsum\.photos/.test(preview), false);
    assert.match(edge, /og:title/);
    assert.match(edge, /AbortController/);
    assert.match(edge, /instagram/);
    assert.equal(/graph\.facebook|saves api|instagram\.com\/api|Sample Instagram/i.test(edge), false);
    assert.match(edge, /169\.254|isBlockedPreviewHost|private/);
    assert.match(help, /shop URL|buy URL|buy link/i);

    const paste = source('app/(app)/paste.tsx');
    assert.equal(/DEMO_STUB/.test(paste), false);
    assert.equal(/Preview stub/.test(paste), false);
    assert.equal(/Sample Instagram/.test(paste), false);
    assert.match(paste, /Pin as wishlist item/);
    assert.match(paste, /draftFromPreview/);
    assert.match(paste, /FieldHelp\.instagram/);
  });
});
