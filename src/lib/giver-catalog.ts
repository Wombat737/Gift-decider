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
  listeners: Set<() => void>;
};

function liveRoot(): LiveRoot {
  const global = globalThis as typeof globalThis & { [LIVE_KEY]?: LiveRoot };
  if (!global[LIVE_KEY]) {
    global[LIVE_KEY] = { version: 0, byToken: new Map(), listeners: new Set() };
  }
  return global[LIVE_KEY];
}

/** Expo Router can pass a dynamic segment as string[]. */
export function shareTokenParam(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    return typeof value[0] === 'string' && value[0] !== 'undefined' ? value[0] : undefined;
  }
  return typeof value === 'string' && value !== 'undefined' ? value : undefined;
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
  liveRoot().byToken = new Map();
  notifyLive();
}

export function patchGiverCatalog(token: string, item: WishlistItem) {
  if (!token) return;
  const root = liveRoot();
  const current = root.byToken.get(token) ?? (isDemoShareToken(token) ? listDemoSharedItems(token) : []);
  root.byToken.set(token, replaceSharedItem(current, item));
  notifyLive();
}

export function writeGiverCatalog(token: string, items: WishlistItem[]) {
  if (!token) return;
  const root = liveRoot();
  const previous = root.byToken.get(token) ?? [];
  root.byToken.set(
    token,
    items.map((row) => mergeGiverItem(row, previous.find((item) => item.id === row.id))),
  );
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
  const version = useSyncExternalStore(subscribeGiverCatalog, getGiverCatalogVersion, getGiverCatalogVersion);
  return useMemo(() => (token ? peekGiverCatalog(token) : []), [token, version]);
}
