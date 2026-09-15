import { usesDemoData } from '@/lib/app-mode';
import { env } from '@/lib/env';
import {
  asHealLinkRequest,
  healLink,
  healLinkAsync,
  type HealAlternative,
  type HealLinkRequest,
  type HealLinkResult,
} from '@/lib/heal-link';
import { supabase } from '@/lib/supabase';
import type { WishlistItem } from '@/lib/types';

type EdgeHealPayload = {
  health?: unknown;
  source?: unknown;
  suggestions?: unknown;
  alternatives?: unknown;
};

function asAlternatives(rows: unknown, fallback: HealAlternative[]): HealAlternative[] {
  if (!Array.isArray(rows)) return fallback;
  const parsed = rows
    .map((row, index): HealAlternative | null => {
      if (!row || typeof row !== 'object') return null;
      const entry = row as Record<string, unknown>;
      const title = typeof entry.title === 'string' ? entry.title.trim() : '';
      const merchant = typeof entry.merchant === 'string' ? entry.merchant.trim() : '';
      const buyUrl =
        typeof entry.buyUrl === 'string'
          ? entry.buyUrl.trim()
          : typeof entry.buy_url === 'string'
            ? entry.buy_url.trim()
            : '';
      if (!title || !merchant || !buyUrl) return null;
      const reason =
        typeof entry.reason === 'string' && entry.reason.trim() ? entry.reason.trim() : 'Close AU-store alternative.';
      return {
        id: typeof entry.id === 'string' && entry.id ? entry.id : `edge-${index}`,
        title,
        merchant,
        buyUrl,
        reason,
      };
    })
    .filter((row): row is HealAlternative => Boolean(row));
  return parsed.length ? parsed.slice(0, 3) : fallback;
}

/**
 * Client entry for the `heal-link` Edge Function.
 * Without Supabase this is a no-op — the local stub stays in charge.
 * Never calls OpenAI/Anthropic from the app.
 */
export async function invokeHealLinkEdge(request: HealLinkRequest): Promise<Partial<HealLinkResult> | null> {
  if (usesDemoData() || !env.isSupabaseConfigured || !supabase) return null;
  try {
    const { data, error } = await supabase.functions.invoke('heal-link', {
      body: {
        url: request.buy_url,
        title: request.title,
        notes: request.notes,
        tags: request.tags,
        no_substitution: request.no_substitution,
        item_kind: request.item_kind,
      },
    });
    if (error || !data || typeof data !== 'object') return null;
    const payload = data as EdgeHealPayload;
    const health =
      payload.health === 'ok' || payload.health === 'dead' || payload.health === 'missing' ? payload.health : undefined;
    const source =
      payload.source === 'stub' || payload.source === 'head' || payload.source === 'llm' ? payload.source : 'stub';
    return {
      health,
      source,
      alternatives: asAlternatives(payload.alternatives ?? payload.suggestions, []),
    };
  } catch {
    return null;
  }
}

/**
 * Giver-only heal. Heuristic first (demo-safe). Optional edge HEAD probe
 * when Supabase is configured. LLM slot is wired but unused without a key.
 */
export async function runHealLink(item: WishlistItem): Promise<HealLinkResult> {
  const request = asHealLinkRequest(item);
  const local = healLink(request);

  if (usesDemoData() || !env.isSupabaseConfigured) return local;

  return healLinkAsync(request, {
    probe: async (url) => {
      const edge = await invokeHealLinkEdge({ ...request, buy_url: url });
      if (edge?.health === 'dead' || edge?.health === 'ok' || edge?.health === 'missing') return edge.health;
      return 'unknown';
    },
  });
}
