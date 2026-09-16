import { useMemo, useSyncExternalStore } from 'react';

import {
  getDemoStoreVersion,
  isDemoShareToken,
  listDemoSharedItems,
  subscribeDemoStore,
} from '@/lib/demo-store';
import { mergeGiverItem, replaceSharedItem } from '@/lib/giver-status';
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

function notifyLive() {
  const root = liveRoot();
  root.version += 1;
  for (const listener of [...root.listeners]) listener();
}

export function patchGiverCatalog(token: string, item: WishlistItem) {
  if (!token || isDemoShareToken(token)) return;
  const root = liveRoot();
  const current = root.byToken.get(token) ?? [];
  root.byToken.set(token, replaceSharedItem(current, item));
  notifyLive();
}

export function writeGiverCatalog(token: string, items: WishlistItem[]) {
  if (!token || isDemoShareToken(token)) return;
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
  if (isDemoShareToken(token)) return listDemoSharedItems(token);
  return liveRoot().byToken.get(token) ?? [];
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
