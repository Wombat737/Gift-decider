/** Buy-link draft autofill. Public OG/meta only — no Instagram scrape, no login walls. */

export const BUY_LINK_AUTOFILL_FAIL = 'Couldn’t grab a photo — add one';

export type BuyLinkDraft = {
  title: string | null;
  notes: string | null;
  imageUrl: string | null;
};

export type BuyLinkFields = {
  title: string;
  notes: string;
  imageUrl: string;
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
  return title.slice(0, 120);
}

export function lightNotes(raw: string | null | undefined, title?: string | null): string | null {
  if (!raw) return null;
  let text = decodeHtmlEntities(raw)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  if (title && text.toLowerCase() === title.toLowerCase()) return null;
  if (text.length > 180) {
    const cut = text.slice(0, 177);
    const lastSpace = cut.lastIndexOf(' ');
    text = `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }
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
  if (Array.isArray(value)) return imageFromJsonLd(value[0]);
  if (value && typeof value === 'object' && 'url' in value && typeof value.url === 'string') return value.url;
  return null;
}

function isProductType(value: unknown) {
  if (typeof value === 'string') return value.toLowerCase() === 'product';
  if (Array.isArray(value)) return value.some((entry) => String(entry).toLowerCase() === 'product');
  return false;
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
        return {
          title: typeof record.name === 'string' ? record.name : null,
          notes: typeof record.description === 'string' ? record.description : null,
          imageUrl: imageFromJsonLd(record.image),
        };
      }
    } catch {
      // Ignore broken JSON-LD — OG tags still win.
    }
  }
  return { title: null, notes: null, imageUrl: null };
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
  const imageUrl = sanitizeImageUrl(
    readMeta(html, ['og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src']) ?? jsonLd.imageUrl,
    pageUrl,
  );
  return { title, notes, imageUrl };
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
  return patch;
}

export function previewLooksLikeStub(preview: {
  stub?: boolean;
  title?: string | null;
  image_url?: string | null;
} | null | undefined) {
  if (!preview) return true;
  if (preview.stub) return true;
  if (preview.image_url && /picsum\.photos/i.test(preview.image_url)) return true;
  if (preview.title && /^preview of /i.test(preview.title)) return true;
  return false;
}

export function draftFromPreview(
  preview: {
    url?: string | null;
    title?: string | null;
    description?: string | null;
    image_url?: string | null;
    stub?: boolean;
  } | null | undefined,
): BuyLinkDraft {
  if (previewLooksLikeStub(preview)) {
    return { title: null, notes: null, imageUrl: null };
  }
  const title = tidyPreviewTitle(preview?.title);
  return {
    title,
    notes: lightNotes(preview?.description, title),
    imageUrl: sanitizeImageUrl(preview?.image_url, preview?.url),
  };
}

export function autofillHint(draft: BuyLinkDraft) {
  return draft.imageUrl ? null : BUY_LINK_AUTOFILL_FAIL;
}
