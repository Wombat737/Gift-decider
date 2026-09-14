// Optional LLM assist for giver substitutes. No Instagram, no RAG.
// Without OPENAI_API_KEY this returns { source: 'stub', suggestions: [] }
// and the app uses its deterministic heuristic catalog.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Body = {
  title?: string;
  notes?: string;
  tags?: string[];
  item_kind?: string;
  no_substitution?: boolean;
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'POST JSON { title, tags, notes }' }, 405);
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (body.no_substitution) {
    return json({ source: 'locked', suggestions: [] });
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
  if (!apiKey) {
    return json({ source: 'stub', suggestions: [] });
  }

  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-4o-mini';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Suggest up to 3 close gift alternatives as JSON: {"suggestions":[{"title":"","reason":""}]}. Honour vibe tags. No preamble.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            title: body.title,
            notes: body.notes,
            tags: body.tags ?? [],
            item_kind: body.item_kind,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    return json({ source: 'stub', suggestions: [] });
  }

  const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = payload.choices?.[0]?.message?.content ?? '';
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return json({ source: 'stub', suggestions: [] });
  }

  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as { suggestions?: unknown };
    return json({ source: 'llm', suggestions: parsed.suggestions ?? [] });
  } catch {
    return json({ source: 'stub', suggestions: [] });
  }
});
