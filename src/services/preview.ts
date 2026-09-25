import { usesDemoData } from '@/lib/app-mode';
import { env } from '@/lib/env';
import {
  BUY_LINK_AUTOFILL_FAIL,
  draftFromPreview,
  draftWithPageHtml,
  isInstagramHost,
  productImageGuess,
  isWishlistImagesUrl,
  previewLooksLikeStub,
  previewMissMessage,
  previewProviderForHost,
  sanitizeBuyUrl,
  sanitizeImageUrl,
  titleFromBuyUrl,
  type BuyLinkDraft,
} from '@/lib/link-preview';
import { supabase } from '@/lib/supabase';
import type { LinkPreview } from '@/lib/types';

const PREVIEW_MS = 12000;
const PAGE_MS = 8000;
const PAGE_BYTES = 1_200_000;

function honestEmpty(url: string): LinkPreview {
  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = '';
  }

  return {
    url,
    title: null,
    description: null,
    image_url: null,
    provider: isInstagramHost(host) ? 'instagram' : previewProviderForHost(host),
    stub: false,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function asPreview(data: unknown): LinkPreview | null {
  if (!data || typeof data !== 'object') return null;
  if (!('url' in data) && !('image_url' in data) && !('title' in data) && !('stored_image_url' in data)) {
    return null;
  }
  const preview = data as LinkPreview;
  if (previewLooksLikeStub(preview)) return null;
  return preview;
}

/** Public HTML from the phone when the edge function misses the photo. CORS blocks this on web. */
async function fetchPublicPageHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), PAGE_MS);
  const read = async (): Promise<string | null> => {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-AU,en;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
        },
      });
      if (!response.ok) return null;
      const type = response.headers.get('content-type') ?? '';
      if (type && !/text\/html|application\/xhtml|text\/plain/i.test(type)) return null;
      const text = await response.text();
      return text.slice(0, PAGE_BYTES);
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };
  // Abort does not always settle fetch. Cap the wait so the form spinner cannot stick.
  return Promise.race([read(), new Promise<null>((resolve) => setTimeout(() => resolve(null), PAGE_MS + 400))]);
}

async function fetchEdgePreview(url: string): Promise<LinkPreview | null> {
  if (usesDemoData() || !supabase) return null;
  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('preview-url', { body: { url } }),
      PREVIEW_MS,
    );
    if (error && (data == null || typeof data !== 'object')) return null;
    return asPreview(data);
  } catch {
    return null;
  }
}

/**
 * Edge function `preview-url` first (slug is the deploy name, not a display label).
 * If it has no photo — timeout, JWT, datacenter block, or an old stub — read the
 * public page from the device and take the same Open Graph image. No Instagram scrape.
 */
async function loadBuyDraft(safe: string): Promise<{ draft: BuyLinkDraft; preview: LinkPreview }> {
  const htmlPromise = fetchPublicPageHtml(safe);
  const edge = await fetchEdgePreview(safe);
  let draft: BuyLinkDraft = edge ? draftFromPreview(edge) : { title: null, notes: null, imageUrl: null };
  if (!draft.imageUrl) {
    // Amazon's catalog image does not need the page. Don't sit on a slow shop response.
    const htmlWait = productImageGuess(safe) ? 2500 : PAGE_MS + 400;
    const html = await Promise.race([
      htmlPromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), htmlWait)),
    ]);
    draft = draftWithPageHtml(draft, html, safe);
  }

  const host = safeHost(safe);
  const fallback = draft.fallbackImageUrl && draft.fallbackImageUrl !== draft.imageUrl ? draft.fallbackImageUrl : null;
  const preview: LinkPreview = {
    url: edge?.url || safe,
    title: draft.title,
    description: draft.notes,
    image_url: draft.imageUrl,
    stored_image_url: fallback ?? edge?.stored_image_url ?? null,
    provider: isInstagramHost(host) ? 'instagram' : (edge?.provider ?? previewProviderForHost(host)),
    stub: false,
  };
  await cachePreview(preview);
  return { draft, preview };
}

export async function previewUrl(url: string): Promise<LinkPreview> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('Paste a URL first');
  }

  const safe = sanitizeBuyUrl(trimmed);
  if (!safe) return honestEmpty(trimmed);
  return (await loadBuyDraft(safe)).preview;
}

export type BuyLinkAutofill = {
  url: string | null;
  draft: BuyLinkDraft;
  message: string | null;
};

export async function autofillFromBuyUrl(raw: string): Promise<BuyLinkAutofill> {
  const url = sanitizeBuyUrl(raw);
  if (!url) {
    return { url: null, draft: { title: null, notes: null, imageUrl: null }, message: BUY_LINK_AUTOFILL_FAIL };
  }

  let host = '';
  try {
    host = new URL(url).hostname;
  } catch {
    host = '';
  }

  const instagram = isInstagramHost(host);

  let draft: BuyLinkDraft = { title: null, notes: null, imageUrl: null };
  try {
    draft = (await loadBuyDraft(url)).draft;
  } catch {
    // Path title below still fills a shop slug. Pin stays available.
  }

  if (instagram && !draft.title && !draft.notes && !draft.imageUrl) {
    return {
      url,
      draft,
      message: previewMissMessage(draft, true),
    };
  }

  if (!instagram && !draft.title) {
    draft = { ...draft, title: titleFromBuyUrl(url) };
  }
  return { url, draft, message: previewMissMessage(draft, instagram) };
}

/** Download a hotlinked preview image into wishlist-images and return the public URL. */
export async function mirrorPreviewImage(pageUrl: string, imageUrl: string): Promise<string | null> {
  const page = sanitizeBuyUrl(pageUrl);
  const image = sanitizeImageUrl(imageUrl, page);
  if (!page || !image) return null;
  if (isWishlistImagesUrl(image)) return image;
  if (usesDemoData() || !supabase) return null;

  try {
    const { data, error } = await withTimeout(
      supabase.functions.invoke('preview-url', { body: { url: page, image_url: image } }),
      PREVIEW_MS,
    );
    if (error || !data || typeof data !== 'object') return null;
    return sanitizeImageUrl((data as LinkPreview).stored_image_url);
  } catch {
    return null;
  }
}

async function cachePreview(preview: LinkPreview) {
  if (usesDemoData() || !supabase) return;
  if (previewLooksLikeStub(preview)) return;
  if (!preview.title && !preview.image_url && !preview.stored_image_url) return;

  const cachedImage =
    [preview.image_url, preview.stored_image_url].find((value) => value && isWishlistImagesUrl(value)) ??
    preview.image_url ??
    preview.stored_image_url;

  try {
    await supabase.from('link_previews').upsert(
      {
        url: preview.url,
        title: preview.title,
        description: preview.description,
        image_url: cachedImage,
        provider: preview.provider ?? previewProviderForHost(safeHost(preview.url)),
        fetched_at: new Date().toISOString(),
        raw: preview,
      },
      { onConflict: 'url' },
    );
  } catch {
    // A failed cache write must not drop the photo the user is about to see.
  }
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

export function previewFunctionHint() {
  if (!env.isSupabaseConfigured) {
    return 'Public posts only. If we miss the photo, add one yourself.';
  }
  return 'Tries Open Graph on the public page. No Instagram scrape.';
}
