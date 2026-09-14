// Stub only. Does not scrape Instagram, call Meta APIs, or follow redirects.
// Replace the body later with a legal preview provider (oEmbed / your own cache).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PreviewBody = {
  url?: string;
};

function stubPreview(url: string) {
  const host = safeHost(url);
  const isInstagram = host.includes('instagram.com') || host.includes('instagr.am');

  return {
    url,
    title: isInstagram ? 'Sample Instagram gift' : `Preview of ${host || 'this link'}`,
    description: isInstagram
      ? 'Stub caption — no Meta OAuth, no Saves API, no scraper. Pin this as a wishlist item.'
      : 'Stub preview cached as a stand-in until a real preview provider is wired.',
    image_url: `https://picsum.photos/seed/${encodeURIComponent(host || 'gift')}/800/800`,
    provider: isInstagram ? 'instagram' : 'generic',
    stub: true,
  };
}

function safeHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
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

  const url = (body.url ?? '').trim();
  if (!url) {
    return json({ error: 'url is required' }, 400);
  }

  return json(stubPreview(url));
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
