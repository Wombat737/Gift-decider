import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  BUY_LINK_AUTOFILL_FAIL,
  applyBuyLinkDraft,
  autofillHint,
  buyDraftNeedsPage,
  claimAutofillUrl,
  choosePreviewImage,
  draftFromPreview,
  draftWithPageHtml,
  productImageGuess,
  isBlockedPreviewHost,
  isInstagramHost,
  lightNotes,
  NOTES_CAP,
  presentNotes,
  looksLikeCompleteBuyUrl,
  parseHtmlPreview,
  parsePriceAmount,
  previewLooksLikeStub,
  previewMissMessage,
  previewProviderForHost,
  sanitizeBuyUrl,
  sanitizeImageUrl,
  tidyPreviewTitle,
  titleFromBuyUrl,
  usableProductImage,
  INSTAGRAM_PASTE_MISS,
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

  it('prefills a chip-in target from a public price and leaves a typed target alone', () => {
    const priced = parseHtmlPreview(
      `<meta property="og:title" content="Linen throw" />
       <meta property="product:price:amount" content="29.00" />
       <meta property="product:price:currency" content="AUD" />
       <script type="application/ld+json">
         {"@type":"Product","name":"Linen throw","offers":{"@type":"Offer","price":"29.00","priceCurrency":"AUD"}}
       </script>`,
      'https://www.kmart.com.au/product/throw',
    );
    assert.equal(priced.priceAmount, 29);

    const thousands = parseHtmlPreview(
      `<script type="application/ld+json">{"@type":"Product","name":"Machine","offers":{"price":"1,299.00","priceCurrency":"AUD","lowPrice":"999"}}</script>`,
      'https://www.jbhifi.com.au/products/machine',
    );
    assert.equal(thousands.priceAmount, 1299);

    const low = parseHtmlPreview(
      `<script type="application/ld+json">{"@type":"Product","name":"Mug","offers":{"@type":"AggregateOffer","lowPrice":"18.5","priceCurrency":"AUD"}}</script>`,
      'https://www.target.com.au/p/mug',
    );
    assert.equal(low.priceAmount, 18.5);

    const usd = parseHtmlPreview(
      `<meta property="product:price:amount" content="19.00" />
       <meta property="product:price:currency" content="USD" />
       <script type="application/ld+json">{"@type":"Product","name":"Mug","offers":{"price":"19.00","priceCurrency":"USD"}}</script>`,
      'https://www.amazon.com/dp/B00TEST',
    );
    assert.equal(usd.priceAmount, undefined);
    assert.equal(parsePriceAmount('USD 19'), null);

    const audMeta = parseHtmlPreview(
      `<meta itemprop="price" content="15" />
       <meta itemprop="priceCurrency" content="AUD" />`,
      'https://www.kmart.com.au/product/throw',
    );
    assert.equal(audMeta.priceAmount, 15);

    const filled = applyBuyLinkDraft(
      { title: '', notes: '', imageUrl: '', targetAmount: '' },
      { title: 'Linen throw', notes: null, imageUrl: null, priceAmount: 29 },
      { title: '', notes: '', imageUrl: '', targetAmount: '' },
    );
    assert.equal(filled.targetAmount, '29');

    const kept = applyBuyLinkDraft(
      { title: '', notes: '', imageUrl: '', targetAmount: '40' },
      { title: 'Linen throw', notes: null, imageUrl: null, priceAmount: 29 },
      { title: '', notes: '', imageUrl: '', targetAmount: '' },
    );
    assert.equal(kept.targetAmount, undefined);

    const replaced = applyBuyLinkDraft(
      { title: 'Old', notes: '', imageUrl: '', targetAmount: '29' },
      { title: 'New', notes: null, imageUrl: null, priceAmount: 42.5 },
      { title: 'Old', notes: '', imageUrl: '', targetAmount: '29' },
    );
    assert.equal(replaced.targetAmount, '42.50');

    assert.equal(
      buyDraftNeedsPage({ title: 'Mug', notes: null, imageUrl: 'https://cdn.example/mug.jpg', priceAmount: 29 }),
      false,
    );
    assert.equal(buyDraftNeedsPage({ title: 'Mug', notes: null, imageUrl: 'https://cdn.example/mug.jpg' }), true);
    const keptPhoto = draftWithPageHtml(
      { title: 'Mug', notes: null, imageUrl: 'https://cdn.example/mug.jpg' },
      `<meta property="product:price:amount" content="29.00" />
       <meta property="product:price:currency" content="AUD" />`,
      'https://www.kmart.com.au/product/mug',
    );
    assert.equal(keptPhoto.imageUrl, 'https://cdn.example/mug.jpg');
    assert.equal(keptPhoto.priceAmount, 29);

    const fromEdge = draftFromPreview({
      url: 'https://www.kmart.com.au/product/throw',
      title: 'Linen throw',
      image_url: 'https://www.kmart.com.au/images/throw.jpg',
      price_amount: 29,
      stub: false,
    });
    assert.equal(fromEdge.priceAmount, 29);

    const edge = readFileSync(join(root, '../supabase/functions/preview-url/index.ts'), 'utf8');
    assert.match(edge, /price_amount/);
    assert.match(edge, /product:price:amount/);
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
    assert.equal(tidyPreviewTitle('Login • Instagram'), null);
    assert.equal(tidyPreviewTitle('Robot Check'), null);
    assert.equal(isInstagramHost('www.instagram.com'), true);
    assert.equal(isInstagramHost('kmart.com.au'), false);
    assert.equal(NOTES_CAP, 420);
    const pulse =
      "Solve in a flash or it's lights out. Pulse Cube is the ultimate thrilling solving experience – race to beat the glowing Cube, but in just 60 seconds, you're left in the dark.";
    assert.equal(lightNotes(pulse), pulse);
    assert.match(lightNotes(`${pulse} ${'Extra detail. '.repeat(40)}`) ?? '', /…$/);
    assert.equal(lightNotes('A'.repeat(220)), 'A'.repeat(220));
    assert.match(lightNotes('A'.repeat(500)) ?? '', /…$/);
    const clipped = pulse.slice(0, pulse.indexOf(' the dark'));
    assert.equal(presentNotes(clipped), `${clipped}…`);
    assert.equal(presentNotes(pulse), pulse);
    assert.equal(presentNotes('Crew height'), 'Crew height');
  });

  it('wires paste/blur autofill on Add item without blocking Pin or scraping Instagram', () => {
    const fields = source('components/item-fields.tsx');
    const add = source('app/(app)/add.tsx');
    const preview = source('services/preview.ts');
    const edge = readFileSync(join(root, '../supabase/functions/preview-url/index.ts'), 'utf8');
    const help = source('lib/help.ts');

    assert.match(fields, /autofillFromBuyUrl/);
    assert.match(fields, /claimAutofillUrl/);
    assert.match(fields, /inflightUrl\.current = ''/);
    assert.match(fields, /onBlur/);
    assert.match(fields, /onEndEditing/);
    assert.equal(claimAutofillUrl('https://www.kmart.com.au/product/throw/1', '', ''), 'https://www.kmart.com.au/product/throw/1');
    assert.equal(
      claimAutofillUrl('https://www.kmart.com.au/product/throw/1', 'https://www.kmart.com.au/product/throw/1', ''),
      null,
    );
    assert.equal(
      claimAutofillUrl('https://www.kmart.com.au/product/throw/1', '', 'https://www.kmart.com.au/product/throw/1'),
      null,
    );
    assert.equal(claimAutofillUrl('not a url', '', ''), null);
    assert.match(preview, /buyDraftNeedsPage/);
    assert.equal(/Take a price only if the page HTML finished/.test(preview), false);
    assert.match(source('components/text-field.tsx'), /PlaceholderColor/);
    assert.match(source('components/text-field.tsx'), /fontStyle: 'italic'/);
    assert.match(source('app/(app)/add.tsx'), /cards/);
    assert.match(fields, /'Link'/);
    assert.match(fields, /'Photo'/);
    assert.match(fields, /'Name'/);
    assert.match(fields, /'Amount'/);
    assert.match(fields, /'Notes'/);
    assert.match(source('components/add-section.tsx'), /#FFF9F6/);
    assert.match(fields, /BUY_LINK_AUTOFILL_FAIL|Couldn’t grab a photo/);
    assert.match(fields, /previewing/);
    assert.match(add, /Pin to wishlist/);
    assert.equal(/await autofillFromBuyUrl/.test(add), false);
    assert.match(preview, /preview-url/);
    assert.match(edge, /const cap = 420/);
    assert.match(preview, /draftFromPreview/);
    assert.match(preview, /draftWithPageHtml/);
    assert.match(preview, /fetchPublicPageHtml/);
    assert.match(preview, /mirrorPreviewImage/);
    assert.match(preview, /stored_image_url/);
    assert.match(preview, /previewMissMessage/);
    assert.equal(/isInstagramHost\(host\)\) \{\s*return \{ url/.test(preview), false);
    assert.equal(/Sample Instagram gift/.test(preview), false);
    assert.equal(/picsum\.photos/.test(preview), false);
    assert.match(edge, /og:title/);
    assert.match(edge, /og:image:url/);
    assert.match(edge, /image_src/);
    assert.match(edge, /hiRes/);
    assert.match(edge, /api\.instagram\.com\/oembed/);
    assert.match(edge, /stored_image_url/);
    assert.match(edge, /withDeadline/);
    assert.match(edge, /image_url: guess/);
    assert.match(edge, /wishlist-images/);
    assert.match(edge, /facebookexternalhit/);
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
    assert.match(paste, /PhotoField/);
    assert.match(paste, /fallbackUrl/);
  });

  it('resolves more product images and prefers a stored copy when the CDN blocks hotlinks', () => {
    const relative = parseHtmlPreview(
      `<meta property="og:image" content="//cdn.shop.example/throw.jpg?w=1&amp;h=2" />`,
      'https://www.kmart.com.au/product/throw',
    );
    assert.equal(relative.imageUrl, 'https://cdn.shop.example/throw.jpg?w=1&h=2');

    const hires = parseHtmlPreview(
      `<html><title>Linen throw</title><script>"hiRes":"https://m.media-amazon.com/images/I/throw.jpg"</script></html>`,
      'https://www.amazon.com.au/dp/B00TEST1234',
    );
    assert.equal(hires.title, 'Linen throw');
    assert.equal(hires.imageUrl, 'https://m.media-amazon.com/images/I/throw.jpg');

    const contentUrl = parseHtmlPreview(
      `<script type="application/ld+json">{"@type":"Product","name":"Mug","image":{"contentUrl":"https://cdn.example/mug.png"}}</script>`,
      'https://www.target.com.au/p/mug',
    );
    assert.equal(contentUrl.imageUrl, 'https://cdn.example/mug.png');

    const skippedIcon = parseHtmlPreview(
      `<meta property="og:image" content="https://www.kmart.com.au/favicon.ico" />
       <link rel="image_src" href="https://www.kmart.com.au/images/throw.jpg" />`,
      'https://www.kmart.com.au/product/throw',
    );
    assert.equal(skippedIcon.imageUrl, 'https://www.kmart.com.au/images/throw.jpg');
    assert.equal(usableProductImage('https://www.kmart.com.au/favicon.ico'), null);

    const remote = 'https://www.kmart.com.au/images/throw.jpg';
    const stored =
      'https://xxxx.supabase.co/storage/v1/object/public/wishlist-images/uid/photo.jpg';
    const hotlink = 'https://scontent.cdninstagram.com/v/photo.jpg';
    assert.deepEqual(choosePreviewImage(remote, stored), { imageUrl: stored, fallbackImageUrl: remote });
    assert.deepEqual(choosePreviewImage(hotlink, stored), { imageUrl: stored, fallbackImageUrl: hotlink });
    assert.equal(choosePreviewImage('http://shop.example/a.jpg', stored).imageUrl, stored);
    assert.equal(sanitizeImageUrl('//cdn.shop.example/a.jpg', 'https://shop.example/p'), 'https://cdn.shop.example/a.jpg');

    const withStored = draftFromPreview({
      url: 'https://www.instagram.com/p/abc/',
      title: 'Linen on the chair',
      image_url: hotlink,
      stored_image_url: stored,
      stub: false,
    });
    assert.equal(withStored.imageUrl, stored);
    assert.equal(withStored.fallbackImageUrl, hotlink);
    assert.equal(previewMissMessage({ title: null, notes: null, imageUrl: null }, true), INSTAGRAM_PASTE_MISS);
    assert.equal(previewMissMessage({ title: 'Throw', notes: null, imageUrl: null }, false), BUY_LINK_AUTOFILL_FAIL);

    const fromPage = draftWithPageHtml(
      { title: 'Washed linen throw', notes: null, imageUrl: null },
      kmartHtml,
      'https://www.kmart.com.au/product/washed-linen-throw/123',
    );
    assert.equal(fromPage.title, 'Washed linen throw');
    assert.equal(fromPage.imageUrl, 'https://www.kmart.com.au/images/throw.jpg');

    const keptPhoto = draftWithPageHtml(
      {
        title: 'Mine',
        notes: null,
        imageUrl: stored,
        fallbackImageUrl: remote,
      },
      kmartHtml,
      'https://www.kmart.com.au/product/throw',
    );
    assert.equal(keptPhoto.imageUrl, stored);
    assert.equal(keptPhoto.fallbackImageUrl, remote);

    const asin = 'https://www.amazon.com.au/dp/B08N5WRWNW';
    assert.equal(
      productImageGuess(asin),
      'https://m.media-amazon.com/images/P/B08N5WRWNW.01._SCLZZZZZZZ_SX500_.jpg',
    );
    assert.equal(productImageGuess('https://www.kmart.com.au/product/throw/1'), null);
    const guessed = draftWithPageHtml(
      { title: null, notes: null, imageUrl: null },
      '<html><title>Robot Check</title></html>',
      asin,
    );
    assert.equal(guessed.title, null);
    assert.equal(guessed.imageUrl, productImageGuess(asin));
  });
});
