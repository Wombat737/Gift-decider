// Public-page preview for buy links and Instagram paste.
// Open Graph / meta / JSON-LD Product, plus Instagram's public oEmbed when it
// answers without a token. No unofficial Instagram APIs, no login walls.
// If the image URL is hotlink-blocked, download it here and store it in
// wishlist-images so the app can preview a URL it is allowed to load.
// Empty fields if the page hides metadata — never a fake sample gift.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FETCH_MS = 5000;
const IMAGE_MS = 4000;
const MAX_BYTES = 1_200_000;
const MAX_IMAGE_BYTES = 8_000_000;
const MIN_IMAGE_BYTES = 1000;
const PRIVATE_V4 = /^(0+|10|127)\.|^169\.254\.|^192\.168\.|^172\.(1[6-9]|2\d|3[0-1])\./;
const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const CRAWLER_UA = 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)';

type PreviewBody = {
  url?: string;
  image_url?: string;
};

type Preview = {
  url: string;
  title: string | null;
  description: string | null;
  image_url: string | null;
  stored_image_url: string | null;
  provider: string;
  stub: boolean;
};

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
  if (!title || /^preview of /i.test(title)) return null;
  if (
    /^(instagram|login\s*[•·|:-]\s*instagram|www\.instagram\.com)$/i.test(title) ||
    /robot check|access denied|just a moment|attention required|captcha/i.test(title)
  ) {
    return null;
  }
  return title.slice(0, 120);
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

function isDecorativeImageUrl(url: string) {
  return /favicon|apple-touch-icon|sprite(?:[./_-]|$)|pixel(?:[./_-]|$)|spacer|1x1|blank\.gif|\/badge(?:[./_-]|$)|\/tracking(?:[./_-]|$)|analytics|\/logo(?:[._-]|$)/i.test(
    url,
  );
}

function sanitizeImageUrl(raw: string | null, pageUrl: string) {
  if (!raw) return null;
  try {
    const parsed = new URL(raw, pageUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.username || parsed.password) return null;
    if (isBlockedPreviewHost(parsed.hostname)) return null;
    if (parsed.hostname.replace(/^www\./, '') === 'picsum.photos') return null;
    const value = parsed.toString();
    if (isDecorativeImageUrl(value)) return null;
    return value;
  } catch {
    return null;
  }
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
        return {
          title: typeof record.name === 'string' ? record.name : null,
          description: typeof record.description === 'string' ? record.description : null,
          image: imageFromJsonLd(record.image),
        };
      }
    } catch {
      // Broken JSON-LD is fine — OG tags still apply.
    }
  }
  return { title: null, description: null, image: null };
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
      if (urls[0]) return urls[0];
    } catch {
      const url = decoded.match(/https?:[^"'\s]+/);
      if (url?.[0]) return url[0];
    }
  }

  const embedded = html.match(/["']og:image["']\s*:\s*["']((?:https?:\\?\/\\?\/)[^"']+)["']/);
  if (embedded?.[1]) return unescapeJsonUrl(embedded[1]);
  return null;
}

function parseHtml(html: string, pageUrl: string) {
  const jsonLd = readJsonLdProduct(html);
  const titleTag = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() ?? null;
  const title = tidyTitle(readMeta(html, ['og:title', 'twitter:title']) ?? jsonLd.title ?? titleTag);
  const description = lightNotes(
    readMeta(html, ['og:description', 'twitter:description', 'description']) ?? jsonLd.description,
    title,
  );
  const candidates = [
    readMeta(html, ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src']),
    readLinkImage(html),
    jsonLd.image,
    readLooseProductImage(html),
  ];
  let image_url: string | null = null;
  for (const candidate of candidates) {
    const url = sanitizeImageUrl(candidate, pageUrl);
    if (url) {
      image_url = url;
      break;
    }
  }
  return { title, description, image_url };
}

function emptyPreview(url: string, provider: string): Preview {
  return {
    url,
    title: null,
    description: null,
    image_url: null,
    stored_image_url: null,
    provider,
    stub: false,
  };
}

function providerFor(host: string) {
  return isInstagramHost(host) ? 'instagram' : previewProviderForHost(host);
}

function amazonImageCandidate(pageUrl: string): string | null {
  let host = '';
  try {
    host = new URL(pageUrl).hostname;
  } catch {
    return null;
  }
  if (!/amazon\./i.test(host) && bareHost(host) !== 'amzn.to') return null;
  const asin = pageUrl.match(/\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Z0-9]{10})(?:[/?#]|$)/i)?.[1];
  if (!asin) return null;
  return `https://m.media-amazon.com/images/P/${asin.toUpperCase()}.01._SCLZZZZZZZ_SX500_.jpg`;
}

async function fetchPublicHtml(url: string, userAgent: string) {
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
        'User-Agent': userAgent,
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
    if (contentType && !/text\/html|application\/xhtml\+xml|text\/plain|application\/json/i.test(contentType)) {
      return null;
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    const slice = buffer.byteLength > MAX_BYTES ? buffer.slice(0, MAX_BYTES) : buffer;
    return { html: new TextDecoder('utf-8').decode(slice), finalUrl, host: finalHost };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchInstagramOEmbed(pageUrl: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_MS);
  try {
    const endpoint = `https://api.instagram.com/oembed/?url=${encodeURIComponent(pageUrl)}`;
    const response = await fetch(endpoint, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { Accept: 'application/json', 'User-Agent': BROWSER_UA },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { title?: unknown; thumbnail_url?: unknown };
    const title = typeof data.title === 'string' ? data.title : null;
    const image = typeof data.thumbnail_url === 'string' ? data.thumbnail_url : null;
    if (!title && !image) return null;
    return { title, image };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function sniffImage(bytes: Uint8Array): { ext: string; contentType: string } | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return { ext: 'jpg', contentType: 'image/jpeg' };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return { ext: 'png', contentType: 'image/png' };
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return { ext: 'gif', contentType: 'image/gif' };
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: 'webp', contentType: 'image/webp' };
  }
  return null;
}

function userIdFromAuth(header: string | null) {
  if (!header) return null;
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const padded = part.replace(/-/g, '+').replace(/_/g, '/');
    const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const json = JSON.parse(atob(padded + pad)) as { sub?: unknown; role?: unknown };
    if (json.role !== 'authenticated') return null;
    if (typeof json.sub !== 'string') return null;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(json.sub)) return null;
    return json.sub;
  } catch {
    return null;
  }
}

async function downloadImage(imageUrl: string, pageUrl: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), IMAGE_MS);
  try {
    const response = await fetch(imageUrl, {
      method: 'GET',
      redirect: 'follow',
      signal: ctrl.signal,
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        'User-Agent': BROWSER_UA,
        Referer: pageUrl,
      },
    });
    if (!response.ok) return null;
    let finalHost = '';
    try {
      finalHost = new URL(response.url || imageUrl).hostname;
    } catch {
      return null;
    }
    if (isBlockedPreviewHost(finalHost)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength < MIN_IMAGE_BYTES || bytes.byteLength > MAX_IMAGE_BYTES) return null;
    const sniffed = sniffImage(bytes);
    if (!sniffed) return null;
    return { bytes, ...sniffed };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function storeImage(req: Request, imageUrl: string, pageUrl: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authHeader = req.headers.get('Authorization');
  const userId = userIdFromAuth(authHeader);
  if (!supabaseUrl || !anonKey || !authHeader || !userId) return null;
  if (imageUrl.startsWith(supabaseUrl) && imageUrl.includes('/wishlist-images/')) return imageUrl;

  const image = await downloadImage(imageUrl, pageUrl);
  if (!image) return null;

  const objectPath = `${userId}/${crypto.randomUUID()}.${image.ext}`;
  const uploadUrl = `${supabaseUrl}/storage/v1/object/wishlist-images/${objectPath}`;
  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        apikey: anonKey,
        'Content-Type': image.contentType,
        'x-upsert': 'false',
      },
      body: image.bytes,
    });
    if (!response.ok) return null;
    return `${supabaseUrl}/storage/v1/object/public/wishlist-images/${objectPath}`;
  } catch {
    return null;
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
  const explicitImage = body.image_url ? sanitizeImageUrl(body.image_url, url) : null;
  if (body.image_url && !explicitImage) {
    return json(emptyPreview(url, providerFor(host)));
  }

  if (explicitImage) {
    const stored = await storeImage(req, explicitImage, url);
    return json({
      url,
      title: null,
      description: null,
      image_url: explicitImage,
      stored_image_url: stored,
      provider: providerFor(host),
      stub: false,
    });
  }

  const instagram = isInstagramHost(host);
  const [primary, oembed] = await Promise.all([
    fetchPublicHtml(url, instagram ? CRAWLER_UA : BROWSER_UA),
    instagram ? fetchInstagramOEmbed(url) : Promise.resolve(null),
  ]);
  let parsed = primary ? parseHtml(primary.html, primary.finalUrl) : { title: null, description: null, image_url: null };
  let finalUrl = primary?.finalUrl ?? url;
  let finalHost = primary?.host || host;

  if (!parsed.image_url) {
    const second = await fetchPublicHtml(url, instagram ? BROWSER_UA : CRAWLER_UA);
    if (second) {
      const again = parseHtml(second.html, second.finalUrl);
      parsed = {
        title: parsed.title ?? again.title,
        description: parsed.description ?? again.description,
        image_url: again.image_url ?? parsed.image_url,
      };
      if (again.image_url || again.title) {
        finalUrl = second.finalUrl;
        finalHost = second.host || finalHost;
      }
    }
  }

  if (!parsed.image_url && oembed?.image) {
    parsed.image_url = sanitizeImageUrl(oembed.image, finalUrl);
  }
  if (!parsed.title && oembed?.title) {
    parsed.title = tidyTitle(oembed.title);
  }

  if (!parsed.image_url) {
    const guess = amazonImageCandidate(finalUrl);
    const storedGuess = guess ? await storeImage(req, guess, finalUrl) : null;
    if (storedGuess) {
      parsed.image_url = guess;
      return json({
        url,
        title: parsed.title,
        description: parsed.description,
        image_url: parsed.image_url,
        stored_image_url: storedGuess,
        provider: providerFor(finalHost),
        stub: false,
      });
    }
  }

  const stored = parsed.image_url ? await storeImage(req, parsed.image_url, finalUrl) : null;
  return json({
    url,
    title: parsed.title,
    description: parsed.description,
    image_url: parsed.image_url,
    stored_image_url: stored,
    provider: providerFor(finalHost),
    stub: false,
  });
});
