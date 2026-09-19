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
      listeners: new Set(),
    };
  }
  const root = global[LIVE_KEY];
  if (!root.hydrated) root.hydrated = new Set();
  if (!root.writeGen) root.writeGen = new Map();
  return root;
}

/** Expo Router can pass a dynamic segment as string[]. */
export function shareTokenParam(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' && value[0] !== 'undefined' ? value[0] : undefined;
  }
  return typeof value === 'string' && value !== 'undefined' ? value : undefined;
}

/** Pathname keeps /g/:token even when layout useLocalSearchParams is still empty. */
export function shareTokenFromPathname(pathname: string | undefined): string | undefined {
  if (!pathname) return undefined;
  const match = pathname.match(/(?:^|\/)g\/([^/?#]+)/);
  return shareTokenParam(match?.[1]);
}

/** Prefer local params, then global, then the /g/:token path segment. */
export function shareTokenFromRoute(input: {
  local?: unknown;
  global?: unknown;
  pathname?: string;
}): string | undefined {
  return shareTokenParam(input.local) ?? shareTokenParam(input.global) ?? shareTokenFromPathname(input.pathname);
}

/**
 * First giver-list paint. Empty is only legal after this token has been fetched
 * (or the query filtered to zero). Anything else is a skeleton — never a flash
 * of “no items yet”.
 */
export function giverListPaint(input: {
  token?: string;
  loading: boolean;
  hydrated: boolean;
  itemCount: number;
  query?: string;
}): 'skeleton' | 'grid' | 'empty' {
  if (input.itemCount > 0) return 'grid';
  if (input.query?.trim()) return 'empty';
  if (!input.token || input.loading || !input.hydrated) return 'skeleton';
  return 'empty';
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
  if (!token) return;
  const root = liveRoot();
  if (writeGen != null && root.writeGen.get(token) !== writeGen) return;
  const previous = root.byToken.get(token) ?? [];
  root.byToken.set(
    token,
    items.map((row) => mergeGiverItem(row, previous.find((item) => item.id === row.id))),
  );
  root.hydrated.add(token);
  notifyLive();
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
