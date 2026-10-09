/** Buy-link draft autofill. Public OG/meta / oEmbed only — no Instagram scrape, no login walls. */

export const BUY_LINK_AUTOFILL_FAIL = 'Couldn’t grab a photo — add one';
export const INSTAGRAM_PASTE_MISS = 'Couldn’t grab that post — add a title and photo';

export type BuyLinkDraft = {
  title: string | null;
  notes: string | null;
  imageUrl: string | null;
  /** Other preview URL to try when the first image is blocked (hotlink / ATS). */
  fallbackImageUrl?: string | null;
  /** Dollar amount from public product metadata (JSON-LD offer or price meta). */
  priceAmount?: number | null;
};

export type BuyLinkFields = {
  title: string;
  notes: string;
  imageUrl: string;
  /** Chip-in target. Optional so Instagram paste can ignore a shop price. */
  targetAmount?: string;
};

const PRIVATE_V4 = /^(0+|10|127)\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./;
const AU_HOST_PROVIDERS: Record<string, string> = {
  'amazon.com.au': 'amazon-au',
  'amzn.to': 'amazon-au',
  'amazon.com': 'amazon',
  'kmart.com.au': 'kmart',
  'target.com.au': 'target-au',
  'bigw.com.au': 'bigw',
  'myer.com.au': 'myer',
  'davidjones.com': 'david-jones',
  'theiconic.com.au': 'the-iconic',
  'bunnings.com.au': 'bunnings',
  'officeworks.com.au': 'officeworks',
  'jbhifi.com.au': 'jb-hi-fi',
  'cottonon.com': 'cotton-on',
  'woolworths.com.au': 'woolworths',
  'catch.com.au': 'catch',
  'kogan.com': 'kogan',
  'ebay.com.au': 'ebay-au',
};

const PATH_SKIP = new Set([
  'dp',
  'gp',
  'product',
  'products',
  'p',
  'pd',
  's',
  'search',
  'itm',
  'ip',
  'item',
  'shop',
  'store',
]);

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (raw, ent: string) => {
    if (ent[0] === '#') {
      const code =
        ent[1] === 'x' || ent[1] === 'X' ? Number.parseInt(ent.slice(2), 16) : Number.parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : raw;
    }
    return NAMED_ENTITIES[ent.toLowerCase()] ?? raw;
  });
}

function bareHost(host: string) {
  return host.trim().toLowerCase().replace(/^www\./, '').replace(/^\[|\]$/g, '');
}

export function isBlockedPreviewHost(host: string) {
  const name = bareHost(host);
  if (!name) return true;
  if (name === 'localhost' || name.endsWith('.localhost') || name.endsWith('.local')) return true;
  if (name === '::1' || name === '0.0.0.0') return true;
  if (name === 'metadata.google.internal' || name.endsWith('.internal')) return true;
  if (PRIVATE_V4.test(name)) return true;
  return false;
}

export function isInstagramHost(host: string) {
  const name = bareHost(host);
  return name === 'instagram.com' || name === 'instagr.am' || name.endsWith('.instagram.com');
}

export function previewProviderForHost(host: string) {
  const name = bareHost(host);
  return AU_HOST_PROVIDERS[name] ?? 'generic';
}

export function sanitizeBuyUrl(raw: string | null | undefined): string | null {
  let value = (raw ?? '').trim();
  if (!value || value.length > 2048) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) {
    value = `https://${value}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  if (isBlockedPreviewHost(parsed.hostname)) return null;
  if (!parsed.hostname.includes('.')) return null;
  return parsed.toString();
}

export function looksLikeCompleteBuyUrl(raw: string) {
  return sanitizeBuyUrl(raw) !== null;
}

/**
 * A URL is ready to fetch when it is a public buy link we have not already
 * filled, and no request for it is in flight. A cancelled attempt must be
 * allowed to run again — marking it fetched before the draft arrives stuck
 * paste autofill after a remount.
 */
export function claimAutofillUrl(raw: string, filled: string, inflight: string) {
  const trimmed = raw.trim();
  if (!looksLikeCompleteBuyUrl(trimmed)) return null;
  if (trimmed === filled || trimmed === inflight) return null;
  return trimmed;
}

/** Page HTML is still useful when the edge function missed the photo or the price. */
export function buyDraftNeedsPage(draft: BuyLinkDraft) {
  return !draft.imageUrl || draft.priceAmount == null;
}

export function sanitizeImageUrl(raw: string | null | undefined, pageUrl?: string | null): string | null {
  const value = (raw ?? '').trim();
  if (!value) return null;

  let parsed: URL;
  try {
    parsed = pageUrl ? new URL(value, pageUrl) : new URL(value);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (parsed.username || parsed.password) return null;
  if (isBlockedPreviewHost(parsed.hostname)) return null;
  if (parsed.hostname.replace(/^www\./, '') === 'picsum.photos') return null;
  return parsed.toString();
}

export function isDecorativeImageUrl(url: string) {
  return /favicon|apple-touch-icon|sprite(?:[./_-]|$)|pixel(?:[./_-]|$)|spacer|1x1|blank\.gif|\/badge(?:[./_-]|$)|\/tracking(?:[./_-]|$)|analytics|\/logo(?:[._-]|$)/i.test(
    url,
  );
}

/** CDNs that usually 403 when an app loads them without the page as Referer. */
export function isHotlinkProneImageUrl(url: string) {
  return /cdninstagram|fbcdn\.net|pinimg\.com|tiktokcdn|googleusercontent\.com/i.test(url);
}

export function isWishlistImagesUrl(url: string) {
  return /\/storage\/v1\/object\/public\/wishlist-images\//i.test(url);
}

export function usableProductImage(raw: string | null | undefined, pageUrl?: string | null) {
  const url = sanitizeImageUrl(raw, pageUrl);
  if (!url || isDecorativeImageUrl(url)) return null;
  return url;
}

export function choosePreviewImage(remote: string | null, stored: string | null) {
  const storedOk = stored && stored !== remote ? stored : null;
  if (remote && isWishlistImagesUrl(remote)) {
    return { imageUrl: remote, fallbackImageUrl: storedOk };
  }
  // The Storage copy is what the app can load. Shop CDNs often 403 an in-app request
  // even when the page itself is fine, so it is the preview — remote stays as fallback.
  if (storedOk) {
    const fallback = remote && remote !== storedOk && remote.startsWith('https://') ? remote : null;
    return { imageUrl: storedOk, fallbackImageUrl: fallback };
  }
  return { imageUrl: remote, fallbackImageUrl: null as string | null };
}

/** Public product image for an Amazon ASIN when the page hid Open Graph. Not a scrape. */
export function productImageGuess(pageUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(pageUrl);
  } catch {
    return null;
  }
  const host = bareHost(parsed.hostname);
  if (!/(^|\.)amazon\./.test(host) && host !== 'amzn.to') return null;
  const asin = parsed.pathname.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?#]|$)/i)?.[1];
  if (!asin) return null;
  return `https://m.media-amazon.com/images/P/${asin.toUpperCase()}.01._SCLZZZZZZZ_SX500_.jpg`;
}

function titleCaseWords(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => (word.length <= 2 ? word : word[0].toUpperCase() + word.slice(1)))
    .join(' ');
}

export function titleFromBuyUrl(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const parts = parsed.pathname.split('/').filter(Boolean);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const raw = parts[i];
    if (PATH_SKIP.has(raw.toLowerCase())) continue;
    if (/^[A-Z0-9]{8,14}$/.test(raw)) continue;

    let part = raw;
    try {
      part = decodeURIComponent(raw);
    } catch {
      part = raw;
    }
    part = part
      .replace(/\.[a-z0-9]{2,5}$/i, '')
      .replace(/[-_+]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!part || /^\d+$/.test(part) || part.length < 3) continue;
    return titleCaseWords(part).slice(0, 80);
  }
  return null;
}

export function tidyPreviewTitle(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let title = decodeHtmlEntities(raw).replace(/\s+/g, ' ').trim();
  title = title.replace(
    /\s*[|\-–—:•]\s*(Amazon\.com\.au|Amazon\.com|Amazon|Kmart Australia|Kmart|Target Australia|Target|Big W|eBay|Myer|David Jones|The Iconic|Bunnings|Officeworks|JB Hi-Fi).*$/i,
    '',
  );
  title = title.replace(/^Amazon\.com\.au\s*[:|\-–—]\s*/i, '');
  title = title.trim();
  if (!title || /^preview of /i.test(title)) return null;
  if (
    /^(instagram|login\s*[•·|:-]\s*instagram|www\.instagram\.com)$/i.test(title) ||
    /robot check|access denied|just a moment|attention required|captcha/i.test(title)
  ) {
    return null;
  }
  return title.slice(0, 120);
}

/**
 * Keep a normal product blurb intact. The old 180 cap sliced mid-sentence
 * (and the ellipsis could sit on a clipped last line). Stay in sync with
 * supabase/functions/preview-url lightNotes.
 */
export const NOTES_CAP = 420;

export function clipNotes(text: string, cap = NOTES_CAP) {
  if (text.length <= cap) return text;
  const window = text.slice(0, cap);
  const sentence = Math.max(window.lastIndexOf('. '), window.lastIndexOf('! '), window.lastIndexOf('? '));
  const lastSpace = window.lastIndexOf(' ');
  const end = sentence >= 80 ? sentence + 1 : lastSpace > 80 ? lastSpace : window.length;
  return `${window.slice(0, end).trim()}…`;
}

export function lightNotes(raw: string | null | undefined, title?: string | null): string | null {
  if (!raw) return null;
  const text = decodeHtmlEntities(raw)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (title && text.toLowerCase() === title.toLowerCase()) return null;
  return clipNotes(text);
}

/**
 * Notes already saved under the old cap sometimes end mid-thought with no ellipsis.
 * Only that band is repaired — a short note without a full stop stays as written.
 */
export function presentNotes(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (/[.!?…]['"”’)]*$/.test(text) || text.endsWith('...')) return text;
  if (text.length >= 140 && text.length <= 200) return `${text}…`;
  return text;
}

function readAttr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? '').trim() : null;
}

function readMeta(html: string, keys: string[]) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const key = (readAttr(tag, 'property') ?? readAttr(tag, 'name') ?? '').toLowerCase();
    if (!wanted.has(key)) continue;
    const content = readAttr(tag, 'content');
    if (content) return content;
  }
  return null;
}

function readTitleTag(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return null;
  return match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() || null;
}

function imageFromJsonLd(value: unknown): string | null {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = imageFromJsonLd(entry);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.url === 'string') return record.url;
    if (typeof record.contentUrl === 'string') return record.contentUrl;
    if (typeof record.secure_url === 'string') return record.secure_url;
  }
  return null;
}

function unescapeJsonUrl(value: string) {
  return value.replace(/\\\//g, '/').replace(/\\u0026/gi, '&').replace(/\\u002f/gi, '/').replace(/&amp;/gi, '&');
}

function readLinkImage(html: string) {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = (readAttr(tag, 'rel') ?? '').toLowerCase();
    if (!rel.split(/\s+/).includes('image_src')) continue;
    const href = readAttr(tag, 'href');
    if (href) return href;
  }
  return null;
}

function readLooseProductImage(html: string): string | null {
  const hiRes = html.match(/"hiRes"\s*:\s*"((?:https?:)?[^"\\]+|https?:\\\/\\\/[^"]+)"/);
  if (hiRes?.[1]) return unescapeJsonUrl(hiRes[1]);

  const oldHires = html.match(/data-old-hires\s*=\s*["']([^"']+)["']/i);
  if (oldHires?.[1]) return decodeHtmlEntities(oldHires[1]);

  const dynamic = html.match(/data-a-dynamic-image\s*=\s*["']([^"']+)["']/i);
  if (dynamic?.[1]) {
    const decoded = decodeHtmlEntities(dynamic[1]);
    try {
      const map = JSON.parse(decoded) as Record<string, unknown>;
      const urls = Object.keys(map).filter((key) => /^https?:/i.test(key));
      if (urls.length) {
        urls.sort((a, b) => {
          const area = (key: string) => {
            const dims = map[key];
            if (Array.isArray(dims) && dims.length >= 2) return Number(dims[0]) * Number(dims[1]);
            return key.length;
          };
          return area(b) - area(a);
        });
        return urls[0] ?? null;
      }
    } catch {
      const url = decoded.match(/https?:[^"'\s]+/);
      if (url?.[0]) return url[0];
    }
  }

  const embedded = html.match(/["']og:image["']\s*:\s*["']((?:https?:\\?\/\\?\/)[^"']+)["']/);
  if (embedded?.[1]) return unescapeJsonUrl(embedded[1]);
  return null;
}

function pickProductImage(candidates: (string | null | undefined)[], pageUrl: string) {
  for (const candidate of candidates) {
    const url = usableProductImage(candidate, pageUrl);
    if (url) return url;
  }
  return null;
}

function isProductType(value: unknown) {
  if (typeof value === 'string') return value.toLowerCase() === 'product';
  if (Array.isArray(value)) return value.some((entry) => String(entry).toLowerCase() === 'product');
  return false;
}

function currencyIsAud(raw: unknown) {
  if (raw == null || raw === '') return true;
  if (typeof raw !== 'string') return false;
  const value = raw.trim().toUpperCase().replace(/\s+/g, '');
  return value === 'AUD' || value === 'A$' || value === 'AU$' || value === '$';
}

/** A stated dollar amount. Rejects 0, foreign currency codes, and junk. */
export function parsePriceAmount(raw: unknown): number | null {
  if (typeof raw === 'number') {
    if (!Number.isFinite(raw) || raw <= 0 || raw >= 100_000) return null;
    return Math.round(raw * 100) / 100;
  }
  if (typeof raw !== 'string') return null;
  if (/\b(USD|EUR|GBP|NZD|CAD|JPY|US\$)\b/i.test(raw)) return null;
  const match = raw.replace(/,/g, '').match(/(\d+(?:\.\d{1,2})?)/);
  if (!match) return null;
  const amount = Number.parseFloat(match[1] ?? '');
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 100_000) return null;
  return Math.round(amount * 100) / 100;
}

function formatDraftPrice(amount: number) {
  const rounded = parsePriceAmount(amount);
  if (rounded == null) return null;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

function priceFromOffer(offer: unknown, depth = 0): number | null {
  if (depth > 3 || offer == null) return null;
  if (Array.isArray(offer)) {
    for (const entry of offer) {
      const found = priceFromOffer(entry, depth + 1);
      if (found != null) return found;
    }
    return null;
  }
  if (typeof offer !== 'object') return parsePriceAmount(offer);
  const record = offer as Record<string, unknown>;
  if (!currencyIsAud(record.priceCurrency ?? record.currency)) return null;
  const direct = parsePriceAmount(record.price);
  if (direct != null) return direct;
  const low = parsePriceAmount(record.lowPrice);
  if (low != null) return low;
  if (record.priceSpecification) return priceFromOffer(record.priceSpecification, depth + 1);
  return null;
}

function readItemprop(html: string, name: string) {
  for (const tag of html.match(/<(?:meta|span|div)\b[^>]*>/gi) ?? []) {
    if ((readAttr(tag, 'itemprop') ?? '').toLowerCase() !== name) continue;
    const content = readAttr(tag, 'content') ?? readAttr(tag, 'value');
    if (content) return content;
  }
  return null;
}

function readListedPrice(html: string): number | null {
  const metaAmount = readMeta(html, ['product:price:amount', 'og:price:amount']);
  const metaCurrency = readMeta(html, ['product:price:currency', 'og:price:currency']);
  if (currencyIsAud(metaCurrency)) {
    const meta = parsePriceAmount(metaAmount);
    if (meta != null) return meta;
  }
  const itemAmount = readItemprop(html, 'price');
  const itemCurrency = readItemprop(html, 'pricecurrency');
  if (!currencyIsAud(itemCurrency)) return null;
  return parsePriceAmount(itemAmount);
}

function readJsonLdProduct(html: string): BuyLinkDraft {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1] ?? '') as unknown;
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && '@graph' in parsed && Array.isArray((parsed as { '@graph': unknown[] })['@graph'])
          ? (parsed as { '@graph': unknown[] })['@graph']
          : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const record = node as Record<string, unknown>;
        if (!isProductType(record['@type'])) continue;
        const priceAmount = priceFromOffer(record.offers);
        return {
          title: typeof record.name === 'string' ? record.name : null,
          notes: typeof record.description === 'string' ? record.description : null,
          imageUrl: imageFromJsonLd(record.image),
          ...(priceAmount != null ? { priceAmount } : {}),
        };
      }
    } catch {
      // Ignore broken JSON-LD — OG tags still win.
    }
  }
  return { title: null, notes: null, imageUrl: null };
}

/** Fill gaps from public page HTML. Never replaces a photo the edge function already stored. */
export function draftWithPageHtml(draft: BuyLinkDraft, html: string | null, pageUrl: string): BuyLinkDraft {
  const parsed = html ? parseHtmlPreview(html, pageUrl) : { title: null, notes: null, imageUrl: null };
  const imageUrl = draft.imageUrl ?? parsed.imageUrl ?? productImageGuess(pageUrl);
  const priceAmount = draft.priceAmount ?? parsed.priceAmount;
  return {
    title: draft.title ?? parsed.title,
    notes: draft.notes ?? parsed.notes,
    imageUrl,
    ...(priceAmount != null ? { priceAmount } : {}),
    ...(draft.fallbackImageUrl ? { fallbackImageUrl: draft.fallbackImageUrl } : {}),
  };
}

export function parseHtmlPreview(html: string, pageUrl: string): BuyLinkDraft {
  const jsonLd = readJsonLdProduct(html);
  const title = tidyPreviewTitle(
    readMeta(html, ['og:title', 'twitter:title']) ?? jsonLd.title ?? readTitleTag(html),
  );
  const notes = lightNotes(
    readMeta(html, ['og:description', 'twitter:description', 'description']) ?? jsonLd.notes,
    title,
  );
  const imageUrl = pickProductImage(
    [
      readMeta(html, ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']),
      readLinkImage(html),
      jsonLd.imageUrl,
      readLooseProductImage(html),
    ],
    pageUrl,
  );
  const priceAmount = jsonLd.priceAmount ?? readListedPrice(html);
  return { title, notes, imageUrl, ...(priceAmount != null ? { priceAmount } : {}) };
}

export function applyBuyLinkDraft(current: BuyLinkFields, draft: BuyLinkDraft, previous: BuyLinkFields): Partial<BuyLinkFields> {
  const patch: Partial<BuyLinkFields> = {};
  if (draft.title && (!current.title.trim() || current.title.trim() === previous.title.trim())) {
    patch.title = draft.title;
  }
  if (draft.notes && (!current.notes.trim() || current.notes.trim() === previous.notes.trim())) {
    patch.notes = draft.notes;
  }
  if (draft.imageUrl && (!current.imageUrl.trim() || current.imageUrl.trim() === previous.imageUrl.trim())) {
    patch.imageUrl = draft.imageUrl;
  }
  const nextPrice = draft.priceAmount != null ? formatDraftPrice(draft.priceAmount) : null;
  const currentTarget = (current.targetAmount ?? '').trim();
  const previousTarget = (previous.targetAmount ?? '').trim();
  if (nextPrice && (!currentTarget || currentTarget === previousTarget)) {
    patch.targetAmount = nextPrice;
  }
  return patch;
}

export function previewLooksLikeStub(preview: {
  stub?: boolean;
  title?: string | null;
  image_url?: string | null;
  stored_image_url?: string | null;
} | null | undefined) {
  if (!preview) return true;
  if (preview.stub) return true;
  if (preview.image_url && /picsum\.photos/i.test(preview.image_url)) return true;
  if (preview.stored_image_url && /picsum\.photos/i.test(preview.stored_image_url)) return true;
  if (preview.title && /^preview of /i.test(preview.title)) return true;
  return false;
}

export function draftFromPreview(
  preview: {
    url?: string | null;
    title?: string | null;
    description?: string | null;
    image_url?: string | null;
    stored_image_url?: string | null;
    price_amount?: number | string | null;
    stub?: boolean;
  } | null | undefined,
): BuyLinkDraft {
  if (previewLooksLikeStub(preview)) {
    return { title: null, notes: null, imageUrl: null };
  }
  const title = tidyPreviewTitle(preview?.title);
  const remote = sanitizeImageUrl(preview?.image_url, preview?.url);
  const stored = sanitizeImageUrl(preview?.stored_image_url, preview?.url);
  const chosen = choosePreviewImage(remote && isDecorativeImageUrl(remote) ? null : remote, stored);
  const priceAmount = parsePriceAmount(preview?.price_amount);
  return {
    title,
    notes: lightNotes(preview?.description, title),
    imageUrl: chosen.imageUrl,
    ...(chosen.fallbackImageUrl ? { fallbackImageUrl: chosen.fallbackImageUrl } : {}),
    ...(priceAmount != null ? { priceAmount } : {}),
  };
}

export function autofillHint(draft: BuyLinkDraft) {
  return draft.imageUrl ? null : BUY_LINK_AUTOFILL_FAIL;
}

export function previewMissMessage(draft: BuyLinkDraft, instagram = false) {
  if (draft.imageUrl) return null;
  if (instagram && !draft.title && !draft.notes) return INSTAGRAM_PASTE_MISS;
  return BUY_LINK_AUTOFILL_FAIL;
}
