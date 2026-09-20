import { usesDemoData } from '@/lib/app-mode';
import { env } from '@/lib/env';
import {
  BUY_LINK_AUTOFILL_FAIL,
  autofillHint,
  draftFromPreview,
  isInstagramHost,
  previewLooksLikeStub,
  previewProviderForHost,
  sanitizeBuyUrl,
  titleFromBuyUrl,
  type BuyLinkDraft,
} from '@/lib/link-preview';
import { supabase } from '@/lib/supabase';
import type { LinkPreview } from '@/lib/types';

const PREVIEW_MS = 8000;

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

export async function previewUrl(url: string): Promise<LinkPreview> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('Paste a URL first');
  }

  if (!usesDemoData() && supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('preview-url', { body: { url: trimmed } }),
        PREVIEW_MS,
      );
      if (!error && data && typeof data === 'object' && 'url' in data) {
        const preview = data as LinkPreview;
        if (!previewLooksLikeStub(preview)) {
          await cachePreview(preview);
          return preview;
        }
      }
    } catch {
      // Honest empty below — never a demo mug / linen stand-in.
    }
  }

  return honestEmpty(trimmed);
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

  if (isInstagramHost(host)) {
    return { url, draft: { title: null, notes: null, imageUrl: null }, message: BUY_LINK_AUTOFILL_FAIL };
  }

  if (!usesDemoData() && supabase) {
    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('preview-url', { body: { url } }),
        PREVIEW_MS,
      );
      if (!error && data && typeof data === 'object') {
        const preview = data as LinkPreview;
        const draft = draftFromPreview(preview);
        if (draft.title || draft.notes || draft.imageUrl) {
          if (!previewLooksLikeStub(preview)) {
            await cachePreview(preview);
          }
          return { url, draft, message: autofillHint(draft) };
        }
      }
    } catch {
      // Keep typed values. Path title below is a quiet extra, not a block.
    }
  }

  const pathTitle = titleFromBuyUrl(url);
  const draft: BuyLinkDraft = {
    title: pathTitle,
    notes: null,
    imageUrl: null,
  };
  return { url, draft, message: autofillHint(draft) };
}

async function cachePreview(preview: LinkPreview) {
  if (usesDemoData() || !supabase) return;
  if (previewLooksLikeStub(preview)) return;
  if (!preview.title && !preview.image_url) return;

  await supabase.from('link_previews').upsert(
    {
      url: preview.url,
      title: preview.title,
      description: preview.description,
      image_url: preview.image_url,
      provider: preview.provider ?? previewProviderForHost(safeHost(preview.url)),
      fetched_at: new Date().toISOString(),
      raw: preview,
    },
    { onConflict: 'url' },
  );
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
