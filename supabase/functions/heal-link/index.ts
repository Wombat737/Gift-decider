// Dead-link heal stub. Optional HEAD/GET probe; never requires an LLM key.
// Same request/result shape the app uses locally so a cheap model can plug in later.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEAD_STUB = /dead-link|this-link-is-dead|link-is-dead|404-stub|broken-buy-link/i;

type Body = {
  url?: string;
  buy_url?: string;
  title?: string;
  notes?: string;
  tags?: string[];
  no_substitution?: boolean;
  item_kind?: string;
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isMalformed(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol !== 'http:' && parsed.protocol !== 'https:';
  } catch {
    return true;
  }
}

async function probe(url: string): Promise<'ok' | 'dead' | 'unknown'> {
  if (DEAD_STUB.test(url) || isMalformed(url)) return 'dead';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    if (response.status === 405 || response.status === 501) {
      response = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
    }
    clearTimeout(timer);
    if (response.status === 404 || response.status === 410) return 'dead';
    if (response.ok) return 'ok';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'POST JSON { url, title, tags, no_substitution }' }, 405);
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const url = (body.url ?? body.buy_url ?? '').trim();
  if (!url) {
    return json({
      health: 'missing',
      source: 'stub',
      suggestions: [],
      alternatives: [],
    });
  }

  const probed = await probe(url);
  const health = probed === 'unknown' ? 'ok' : probed;

  // Substitutes stay in the app heuristic unless a future LLM key is added here.
  // Honour no_substitution: never return alternatives from this function.
  return json({
    health,
    source: probed === 'unknown' ? 'stub' : probed === 'dead' || probed === 'ok' ? 'head' : 'stub',
    suggestions: [],
    alternatives: [],
    no_substitution: Boolean(body.no_substitution),
  });
});
