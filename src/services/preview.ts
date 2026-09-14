import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { LinkPreview } from '@/lib/types';

function localStub(url: string): LinkPreview {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    host = '';
  }

  const isInstagram = host.includes('instagram.com') || host.includes('instagr.am');

  return {
    url,
    title: isInstagram ? 'Sample Instagram gift' : `Preview of ${host || 'this link'}`,
    description: isInstagram
      ? 'Stub caption — no Meta OAuth, no Saves API, no scraper. Pin this as a wishlist item.'
      : 'Stub preview. Wire preview-url later if you want a real cache.',
    image_url: `https://picsum.photos/seed/${encodeURIComponent(host || 'gift')}/800/800`,
    provider: isInstagram ? 'instagram' : 'generic',
    stub: true,
  };
}

export async function previewUrl(url: string): Promise<LinkPreview> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error('Paste a URL first');
  }

  if (supabase) {
    const { data, error } = await supabase.functions.invoke('preview-url', {
      body: { url: trimmed },
    });

    if (!error && data && typeof data === 'object' && 'url' in data) {
      const preview = data as LinkPreview;
      await cachePreview(preview);
      return preview;
    }
  }

  const preview = localStub(trimmed);
  await cachePreview(preview);
  return preview;
}

async function cachePreview(preview: LinkPreview) {
  if (!supabase) return;

  await supabase.from('link_previews').upsert(
    {
      url: preview.url,
      title: preview.title,
      description: preview.description,
      image_url: preview.image_url,
      provider: preview.provider,
      fetched_at: new Date().toISOString(),
      raw: preview,
    },
    { onConflict: 'url' },
  );
}

export function previewFunctionHint() {
  if (!env.isSupabaseConfigured) {
    return 'Using the in-app stub. Deploy supabase/functions/preview-url to use the Edge Function.';
  }
  return 'Calls the preview-url Edge Function (also a stub — no scraping).';
}
