// Public-page preview for buy links and Instagram paste.
// Fetches Open Graph / meta / JSON-LD Product. No unofficial Instagram APIs,
// no login walls, no private hosts. Timeout is short on purpose. Empty fields
// if the page hides metadata — never a fake sample gift.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FETCH_MS = 4000;
const MAX_BYTES = 400_000;
const PRIVATE_V4 = /^(0+|10|127)\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./;

type PreviewBody = {
  url?: string;
};

type Preview = {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  provider: string;
  stub: boolean;
};

const AU_HOST_PROVIDERS: Record<string, string> = {
  'amazon.com.au': 'amazon-au',
  'amzn.to': 'amazon-au',
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

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function bareHost(host: string) {
  return host.trim().toLowerCase().replace(/^www\./, '').replace(/^\[|\]$/g, '');
}

function isBlockedPreviewHost(host: string) {
  const name = bareHost(host);
  if (!name) return true;
  if (name === 'localhost' || name.endsWith('.localhost') || name.endsWith('.local')) return true;
  if (name === '::1' || name === '0.0.0.0') return true;
  if (name === 'metadata.google.internal' || name.endsWith('.internal')) return true;
  if (PRIVATE_V4.test(name)) return true;
  return false;
}

function isInstagramHost(host: string) {
  const name = bareHost(host);
  return name === 'instagram.com' || name === 'instagr.am' || name.endsWith('.instagram.com');
}

function previewProviderForHost(host: string) {
  return AU_HOST_PROVIDERS[bareHost(host)] ?? 'generic';
}

function sanitizeBuyUrl(raw: string): string | null {
  let value = raw.trim();
  if (!value || value.length > 2048) return null;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) value = `https://${value}`;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (isBlockedPreviewHost(parsed.hostname)) return null;
    if (!parsed.hostname.includes('.')) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function decodeHtmlEntities(value: string) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (raw, ent: string) => {
    if (ent[0] === '#') {
      const code =
        ent[1] === 'x' || ent[1] === 'X' ? Number.parseInt(ent.slice(2), 16) : Number.parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : raw;
    }
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    return named[ent.toLowerCase()] ?? raw;
  });
}

function readAttr(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? '').trim() : null;
}

function readMeta(html: string, keys: string[]) {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (readAttr(tag, 'property') ?? readAttr(tag, 'name') ?? '').toLowerCase();
    if (!wanted.has(key)) continue;
    const content = readAttr(tag, 'content');
    if (content) return content;
  }
  return null;
}

function tidyTitle(raw: string | null) {
  if (!raw) return null;
  let title = decodeHtmlEntities(raw).replace(/\s+/g, ' ').trim();
  title = title.replace(
    /\s*[|\-–—:•]\s*(Amazon\.com\.au|Amazon\.com|Amazon|Kmart Australia|Kmart|Target Australia|Target|Big W|eBay|Myer|David Jones|The Iconic|Bunnings|Officeworks|JB Hi-Fi).*$/i,
    '',
  );
  title = title.replace(/^Amazon\.com\.au\s*[:|\-–—]\s*/i, '').trim();
  return title ? title.slice(0, 120) : null;
}

function lightNotes(raw: string | null, title: string | null) {
  if (!raw) return null;
  let text = decodeHtmlEntities(raw).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!text || (title && text.toLowerCase() === title.toLowerCase())) return null;
  if (text.length > 180) {
    const cut = text.slice(0, 177);
    const lastSpace = cut.lastIndexOf(' ');
    text = `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
  }
  return text;
}

function sanitizeImageUrl(raw: string | null, pageUrl: string) {
  if (!raw) return null;
  try {
    const parsed = new URL(raw, pageUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (isBlockedPreviewHost(parsed.hostname)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function readJsonLdProduct(html: string) {
  const scripts = html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const script of scripts) {
    try {
      const parsed = JSON.parse(script[1] ?? '') as Record<string, unknown> | unknown[];
      const nodes = Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray(parsed['@graph'])
          ? parsed['@graph']
          : [parsed];
      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue;
        const record = node as Record<string, unknown>;
        const type = record['@type'];
        const isProduct =
          typeof type === 'string'
            ? type.toLowerCase() === 'product'
            : Array.isArray(type) && type.some((entry) => String(entry).toLowerCase() === 'product');
        if (!isProduct) continue;
        const image = record.image;
        const imageUrl =
          typeof image === 'string'
            ? image
            : Array.isArray(image) && typeof image[0] === 'string'
              ? image[0]
              : image && typeof image === 'object' && 'url' in image && typeof image.url === 'string'
                ? image.url
                : null;
        return {
          title: typeof record.name === 'string' ? record.name : null,
          description: typeof record.description === 'string' ? record.description : null,
          image: imageUrl,
        };
      }
    } catch {
      // Broken JSON-LD is fine — OG tags still apply.
    }
  }
  return { title: null, description: null, image: null };
}

function parseHtml(html: string, pageUrl: string) {
  const jsonLd = readJsonLdProduct(html);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? null;
  const title = tidyTitle(readMeta(html, ['og:title', 'twitter:title']) ?? jsonLd.title ?? titleTag);
  const description = lightNotes(
    readMeta(html, ['og:description', 'twitter:description', 'description']) ?? jsonLd.description,
    title,
  );
  const image_url = sanitizeImageUrl(
    readMeta(html, ['og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src']) ?? jsonLd.image,
    pageUrl,
  );
  return { title, description, image_url };
}

function emptyPreview(url: string, provider: string): Preview {
  return { url, title: null, description: null, image_url: null, provider, stub: false };
}

function providerFor(host: string) {
  return isInstagramHost(host) ? 'instagram' : previewProviderForHost(host);
}

async function fetchPublicHtml(url: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-AU,en;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (compatible; GiftDecider/1.0; +https://giftdecider.app) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
    });
    if (response.status === 401 || response.status === 403 || response.status === 407) return null;
    const finalUrl = response.url || url;
    let finalHost = '';
    try {
      finalHost = new URL(finalUrl).hostname;
    } catch {
      finalHost = '';
    }
    if (isBlockedPreviewHost(finalHost)) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(contentType)) return null;
    const buffer = new Uint8Array(await response.arrayBuffer());
    const slice = buffer.byteLength > MAX_BYTES ? buffer.slice(0, MAX_BYTES) : buffer;
    return { html: new TextDecoder('utf-8').decode(slice), finalUrl, host: finalHost };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'POST a JSON body: { "url": "https://..." }' }, 405);
  }

  let body: PreviewBody = {};
  try {
    body = (await req.json()) as PreviewBody;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const url = sanitizeBuyUrl(body.url ?? '');
  if (!url) {
    return json({ error: 'url is required' }, 400);
  }

  const host = new URL(url).hostname;
  const fetched = await fetchPublicHtml(url);
  if (!fetched) {
    return json(emptyPreview(url, providerFor(host)));
  }

  const parsed = parseHtml(fetched.html, fetched.finalUrl);
  return json({
    url,
    title: parsed.title,
    description: parsed.description,
    image_url: parsed.image_url,
    provider: providerFor(fetched.host || host),
    stub: false,
  });
});
