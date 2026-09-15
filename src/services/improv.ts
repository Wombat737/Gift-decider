import { env } from '@/lib/env';
import { improvisedSubstitutes } from '@/lib/improv';
import { supabase } from '@/lib/supabase';
import type { GiftSubstitute, WishlistItem } from '@/lib/types';

type LlmSuggestion = {
  title?: unknown;
  reason?: unknown;
};

function parseSuggestions(payload: unknown, item: WishlistItem): GiftSubstitute[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object' && Array.isArray((payload as { suggestions?: unknown }).suggestions)
      ? (payload as { suggestions: unknown[] }).suggestions
      : [];

  return rows
    .map((row, index): GiftSubstitute | null => {
      if (!row || typeof row !== 'object') return null;
      const entry = row as LlmSuggestion;
      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      if (!title) return null;
      const reason =
        typeof entry.reason === 'string' && entry.reason.trim()
          ? entry.reason.trim()
          : 'Vibe-close alternative.';
      return {
        id: `llm-${item.id}-${index}`,
        title,
        reason,
        query: title,
        exactSku: false,
        vibeTags: [...item.tags],
      };
    })
    .filter((row): row is GiftSubstitute => Boolean(row))
    .slice(0, 3);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('LLM timed out')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function fromOpenAi(item: WishlistItem): Promise<GiftSubstitute[]> {
  const key = env.openaiApiKey;
  if (!key) return [];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.llmModel,
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
            title: item.title,
            notes: item.notes,
            tags: item.tags,
            item_kind: item.item_kind,
          }),
        },
      ],
    }),
  });
  if (!response.ok) return [];
  const json = (await response.json()) as { choices?: { message?: { content?: string } }[] };
  const content = json.choices?.[0]?.message?.content ?? '';
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) return [];
  return parseSuggestions(JSON.parse(content.slice(start, end + 1)), item);
}

async function fromEdge(item: WishlistItem): Promise<GiftSubstitute[]> {
  if (env.llmUrl) {
    const response = await fetch(env.llmUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.title,
        notes: item.notes,
        tags: item.tags,
        item_kind: item.item_kind,
        no_substitution: item.no_substitution,
      }),
    });
    if (!response.ok) return [];
    return parseSuggestions(await response.json(), item);
  }

  if (!supabase) return [];
  const { data, error } = await supabase.functions.invoke('improv-substitutes', {
    body: {
      title: item.title,
      notes: item.notes,
      tags: item.tags,
      item_kind: item.item_kind,
      no_substitution: item.no_substitution,
    },
  });
  if (error) return [];
  return parseSuggestions(data, item);
}

function merge(heuristic: GiftSubstitute[], extra: GiftSubstitute[]) {
  const seen = new Set(heuristic.map((row) => row.title.toLowerCase()));
  const merged = [...heuristic];
  for (const row of extra) {
    const key = row.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
  }
  return merged.slice(0, 4);
}

/**
 * Heuristic first (works offline / demo). Optional LLM via env or Edge Function
 * when a key is present. Exact lock never gets LLM alternates — heal-link honours
 * no_substitution with an empty list.
 */
export async function suggestForGiver(item: WishlistItem): Promise<GiftSubstitute[]> {
  const heuristic = improvisedSubstitutes(item);
  if (item.no_substitution) return heuristic;
  if (!env.openaiApiKey && !env.llmUrl && !env.isSupabaseConfigured) return heuristic;

  try {
    const extra = await withTimeout(
      env.openaiApiKey ? fromOpenAi(item) : fromEdge(item),
      4000,
    );
    return merge(heuristic, extra);
  } catch {
    return heuristic;
  }
}
