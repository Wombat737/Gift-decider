import { useMemo, useSyncExternalStore } from 'react';

import {
  DEMO_SHARE_TOKEN,
  getDemoStoreVersion,
  isDemoShareToken,
  listDemoSharedItems,
  subscribeDemoStore,
} from '@/lib/demo-store';
import { mergeGiverItem, preferLocalGiverItem, replaceSharedItem } from '@/lib/giver-status';
import type { WishlistItem } from '@/lib/types';

const LIVE_KEY = '__giftdeciderGiverLiveCatalog';

type LiveRoot = {
  version: number;
  byToken: Map<string, WishlistItem[]>;
  hydrated: Set<string>;
  writeGen: Map<string, number>;
  lastToken?: string;
  listeners: Set<() => void>;
};

function liveRoot(): LiveRoot {
  const global = globalThis as typeof globalThis & { [LIVE_KEY]?: LiveRoot };
  if (!global[LIVE_KEY]) {
    global[LIVE_KEY] = {
      version: 0,
      byToken: new Map(),
      hydrated: new Set(),
      writeGen: new Map(),
      lastToken: undefined,
      listeners: new Set(),
    };
  }
  const root = global[LIVE_KEY];
  if (!root.hydrated) root.hydrated = new Set();
  if (!root.writeGen) root.writeGen = new Map();
  return root;
}

/**
 * Expo Router can pass a dynamic segment as string[], the literal "undefined",
 * or the unnormalized file placeholder `[token]` before the real param hydrates.
 * Those must not be treated as a share token — fetching them settles empty.
 */
export function shareTokenParam(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return undefined;
  let trimmed = raw.trim();
  if (!trimmed || trimmed === 'undefined' || trimmed === 'null') return undefined;
  try {
    trimmed = decodeURIComponent(trimmed);
  } catch {
    // keep the raw segment
  }
  // `/g/[token]` path / param before Expo hydrates the dynamic segment.
  if (/^\[[\w.-]+\]$/.test(trimmed)) return undefined;
  return trimmed;
}

/** Pathname keeps /g/:token even when layout useLocalSearchParams is still empty. */
export function shareTokenFromPathname(pathname: string | undefined): string | undefined {
  if (!pathname) return undefined;
  const match = pathname.match(/(?:^|\/)g\/([^/?#]+)/);
  return shareTokenParam(match?.[1]);
}

export function shareTokenFromSegments(segments: readonly string[] | undefined): string | undefined {
  if (!segments?.length) return undefined;
  const g = segments.lastIndexOf('g');
  if (g < 0) return undefined;
  return shareTokenParam(segments[g + 1]);
}

/** Prefer local params, then global, then the /g/:token path segment. */
export function shareTokenFromRoute(input: {
  local?: unknown;
  global?: unknown;
  pathname?: string;
  segments?: readonly string[];
}): string | undefined {
  return (
    shareTokenParam(input.local) ??
    shareTokenParam(input.global) ??
    shareTokenFromPathname(input.pathname) ??
    shareTokenFromSegments(input.segments)
  );
}

/** Typed href so People → list does not push a param-less `/g/[token]` anchor. */
export function giverShareRoute(token: string) {
  return { pathname: '/g/[token]' as const, params: { token } };
}

export function rememberGiverShare(token: string | undefined) {
  const normalized = shareTokenParam(token);
  if (!normalized) return;
  liveRoot().lastToken = normalized;
}

export function lastGiverShareToken(): string | undefined {
  return shareTokenParam(liveRoot().lastToken);
}

/** People / search / in-app Giver view tab: remember the person and kick the live RPC. */
export function openGiverShare(
  token: string | null | undefined,
  push: (href: ReturnType<typeof giverShareRoute>) => void,
  prefetch?: (token: string) => void | Promise<unknown>,
) {
  if (!token) return;
  rememberGiverShare(token);
  invalidateGiverCatalog(token);
  // Kick the live RPC at the tap — do not wait for g/[token] layout params.
  void prefetch?.(token);
  push(giverShareRoute(token));
}

/** YOUR LIST | GIVER VIEW switcher: reopen the last person, else People. */
export function openLastGiverShare(
  push: (href: ReturnType<typeof giverShareRoute>) => void,
  prefetch?: (token: string) => void | Promise<unknown>,
  fallback?: () => void,
) {
  const token = lastGiverShareToken();
  if (!token) {
    fallback?.();
    return false;
  }
  openGiverShare(token, push, prefetch);
  return true;
}

/** List paints catalog first so chips stay aligned; fall back to the in-flight provider rows. */
export function giverPaintItems<T>(catalog: T[], fallback: T[] = []): T[] {
  return catalog.length > 0 ? catalog : fallback;
}

export type GiverListLoadState = {
  token?: string;
  loading: boolean;
  fetchSettled: boolean;
  settledToken?: string;
  itemCount: number;
  query?: string;
};

export type GiverListLoadEvent =
  | { type: 'route'; token?: unknown }
  | { type: 'fetch-start'; token: string }
  | { type: 'fetch-settle'; token: string; itemCount: number }
  | { type: 'loading-false-without-fetch' };

/**
 * First giver-list paint. Empty is only legal after a fetch for **this** token
 * has settled. `loading === false` alone is not settled — People first-open used
 * to commit the giver empty hero from a placeholder token / 800ms timeout.
 */
export function giverListPaint(input: {
  token?: string;
  loading: boolean;
  fetchSettled?: boolean;
  settledToken?: string;
  hydrated?: boolean;
  itemCount: number;
  query?: string;
  error?: string | null;
}): 'skeleton' | 'grid' | 'empty' {
  if (input.itemCount > 0) return 'grid';
  if (input.query?.trim()) return 'empty';
  const token = shareTokenParam(input.token);
  // Failed / offline RPC is not a quiet list — airplane mode must not settle empty.
  if (input.error) return 'skeleton';
  const settled =
    Boolean(input.fetchSettled) &&
    Boolean(token) &&
    (input.settledToken == null || input.settledToken === token);
  if (!token || input.loading || !settled) return 'skeleton';
  return 'empty';
}

/** True when we would paint the giver empty hero. Illegal before fetch settles. */
export function wouldCommitLoadedEmpty(input: Parameters<typeof giverListPaint>[0]) {
  return giverListPaint(input) === 'empty' && input.itemCount === 0 && !input.query?.trim();
}

export function reduceGiverListLoad(
  state: GiverListLoadState,
  event: GiverListLoadEvent,
): GiverListLoadState {
  switch (event.type) {
    case 'route': {
      const token = shareTokenFromRoute({ local: event.token }) ?? shareTokenParam(event.token);
      if (token === state.token) return { ...state, token };
      return {
        token,
        loading: true,
        fetchSettled: false,
        settledToken: undefined,
        itemCount: 0,
        query: state.query,
      };
    }
    case 'fetch-start':
      return { ...state, token: event.token, loading: true };
    case 'fetch-settle':
      if (event.token !== state.token) return state;
      return {
        ...state,
        loading: false,
        fetchSettled: true,
        settledToken: event.token,
        itemCount: event.itemCount,
      };
    case 'loading-false-without-fetch':
      return { ...state, loading: false };
  }
}

/**
 * Live share tokens must hit share-token RPCs whenever Supabase is configured.
 * Explore-demo session is owner-scaffold only — it must not swallow a real /g/<token>.
 */
export function shouldUseDemoShare(token: string, supabaseReady: boolean) {
  const normalized = shareTokenParam(token) ?? token;
  if (!normalized) return true;
  if (isDemoShareToken(normalized) || normalized === DEMO_SHARE_TOKEN) return true;
  return !supabaseReady;
}

function notifyLive() {
  const root = liveRoot();
  root.version += 1;
  for (const listener of [...root.listeners]) listener();
}

export function resetGiverCatalog() {
  const root = liveRoot();
  root.byToken = new Map();
  root.hydrated = new Set();
  root.writeGen = new Map();
  root.lastToken = undefined;
  notifyLive();
}

/**
 * Forget a stale **empty** hydration so People → list cannot paint Quiet list
 * from a previous `[]`. Keep rows that already loaded — wiping them on every
 * tap is what made #28 retries stick on empty when the follow-up write dropped.
 * Bump writeGen (do not delete it) so in-flight empty writes still lose, while
 * in-flight item writes can still fill an empty catalog.
 */
export function invalidateGiverCatalog(token: string | undefined) {
  if (!token) return;
  const root = liveRoot();
  const existing = root.byToken.get(token) ?? [];
  if (existing.length === 0) {
    root.byToken.delete(token);
    root.hydrated.delete(token);
  }
  const next = (root.writeGen.get(token) ?? 0) + 1;
  root.writeGen.set(token, next);
  notifyLive();
}

/** Bump the per-token write generation so an older in-flight fetch cannot clobber. */
export function beginGiverCatalogWrite(token: string): number {
  const root = liveRoot();
  const next = (root.writeGen.get(token) ?? 0) + 1;
  root.writeGen.set(token, next);
  return next;
}

export function isGiverCatalogHydrated(token: string | undefined): boolean {
  if (!token) return false;
  if (liveRoot().hydrated.has(token)) return true;
  // Demo seed is sync — first open must not wait on a share-token RPC.
  return isDemoShareToken(token);
}

export function patchGiverCatalog(token: string, item: WishlistItem) {
  if (!token) return;
  const root = liveRoot();
  const current = root.byToken.get(token) ?? (isDemoShareToken(token) ? listDemoSharedItems(token) : []);
  root.byToken.set(token, replaceSharedItem(current, item));
  root.hydrated.add(token);
  notifyLive();
}

export function writeGiverCatalog(token: string, items: WishlistItem[], writeGen?: number) {
  if (!token) return false;
  const root = liveRoot();
  const currentGen = root.writeGen.get(token);
  if (writeGen != null && currentGen != null && currentGen !== writeGen) {
    const existing = root.byToken.get(token) ?? [];
    // Stale empty must never wipe. Stale rows may still fill an empty catalog
    // when People prefetch's gen was bumped by the list provider/focus refresh.
    if (items.length === 0 || existing.length > 0) return false;
  }
  const previous = root.byToken.get(token) ?? [];
  root.byToken.set(
    token,
    items.map((row) => mergeGiverItem(row, previous.find((item) => item.id === row.id))),
  );
  root.hydrated.add(token);
  notifyLive();
  return true;
}

export function peekGiverCatalog(token: string): WishlistItem[] {
  if (!token) return [];
  const overlay = liveRoot().byToken.get(token) ?? [];
  if (isDemoShareToken(token)) {
    const demo = listDemoSharedItems(token);
    if (overlay.length === 0) return demo;
    return demo.map((item) => preferLocalGiverItem(item, overlay.find((row) => row.id === item.id) ?? null) ?? item);
  }
  return overlay;
}

function subscribeGiverCatalog(listener: () => void) {
  const unsubDemo = subscribeDemoStore(listener);
  const root = liveRoot();
  root.listeners.add(listener);
  return () => {
    unsubDemo();
    root.listeners.delete(listener);
  };
}

function getGiverCatalogVersion() {
  return getDemoStoreVersion() * 1_000_000 + liveRoot().version;
}

/** Prefer the process-wide catalog so list + detail chips stay aligned after lock. */
export function pickSharedItem(
  itemId: string | undefined,
  catalog: WishlistItem[],
  fallback: WishlistItem[] = [],
): WishlistItem | null {
  if (!itemId) return null;
  return catalog.find((item) => item.id === itemId) ?? fallback.find((item) => item.id === itemId) ?? null;
}

/** List and item screens subscribe here so badges update even if the nested stack remounts. */
export function useGiverCatalog(token: string | undefined): WishlistItem[] {
  return useGiverCatalogState(token).items;
}

export function useGiverCatalogState(token: string | undefined): { items: WishlistItem[]; hydrated: boolean } {
  const version = useSyncExternalStore(subscribeGiverCatalog, getGiverCatalogVersion, getGiverCatalogVersion);
  return useMemo(
    () => ({
      items: token ? peekGiverCatalog(token) : [],
      hydrated: isGiverCatalogHydrated(token),
    }),
    [token, version],
  );
}
