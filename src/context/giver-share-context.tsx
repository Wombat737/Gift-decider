import { useGlobalSearchParams, useLocalSearchParams, usePathname, useSegments } from 'expo-router';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import {
  beginGiverCatalogWrite,
  patchGiverCatalog,
  peekGiverCatalog,
  shareTokenFromRoute,
  writeGiverCatalog,
} from '@/lib/giver-catalog';
import { replaceSharedItem } from '@/lib/giver-status';
import type { SharedWishlist, WishlistItem } from '@/lib/types';
import { useAuth } from '@/context/auth-context';
import { claimShareAsGiver } from '@/services/giver-social';
import { getSharedItems, getSharedWishlist } from '@/services/wishlist';

type GiverShareContextValue = {
  token: string | undefined;
  meta: SharedWishlist | null;
  items: WishlistItem[];
  loading: boolean;
  fetchSettled: boolean;
  error: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  patchItem: (item: WishlistItem) => void;
};

const GiverShareContext = createContext<GiverShareContextValue | null>(null);

export function GiverShareProvider({ children }: PropsWithChildren) {
  const local = useLocalSearchParams<{ token?: string }>();
  const global = useGlobalSearchParams<{ token?: string }>();
  const pathname = usePathname();
  const segments = useSegments();
  const token = shareTokenFromRoute({
    local: local.token,
    global: global.token,
    pathname,
    segments,
  });
  const { user } = useAuth();
  const [meta, setMeta] = useState<SharedWishlist | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [settledToken, setSettledToken] = useState<string | undefined>(undefined);
  const requestSeq = useRef(0);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token) {
        // Layout can paint before the dynamic segment hydrates (`[token]`).
        // Stay loading — a missing / placeholder token is not a fetched-empty list.
        if (!opts?.silent) setLoading(true);
        return;
      }
      const requestId = ++requestSeq.current;
      const writeGen = beginGiverCatalogWrite(token);
      const hasItems = peekGiverCatalog(token).length > 0;
      // Empty catalog must not stay on the giver empty hero during refetch.
      if (!opts?.silent || !hasItems) setLoading(true);
      setError(null);
      try {
        const [nextMeta, nextItems] = await Promise.all([
          getSharedWishlist(token),
          getSharedItems(token, { writeGen }),
        ]);
        if (requestId !== requestSeq.current) return;
        setMeta(nextMeta);
        setItems(nextItems);
        writeGiverCatalog(token, nextItems, writeGen);
        // #28: People prefetch + this beginGiverCatalogWrite could mark the write
        // stale. Never settle Quiet list when the RPC returned rows.
        if (nextItems.length > 0 && peekGiverCatalog(token).length === 0) {
          writeGiverCatalog(token, nextItems);
        }
        setSettledToken(token);
      } catch (err) {
        if (requestId !== requestSeq.current) return;
        setError(err instanceof Error ? err.message : 'Could not open this list');
        // A failed extras/items RPC is not a fetched-empty wishlist.
        if (peekGiverCatalog(token).length > 0) setSettledToken(token);
      } finally {
        if (requestId === requestSeq.current) setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    setSettledToken((current) => (current === token ? current : undefined));
    void refresh();
  }, [refresh, token]);

  useEffect(() => {
    if (!token || !user || user.demo) return;
    void claimShareAsGiver(token);
  }, [token, user]);

  const patchItem = useCallback(
    (item: WishlistItem) => {
      setItems((current) => replaceSharedItem(current, item));
      if (token) patchGiverCatalog(token, item);
    },
    [token],
  );

  const fetchSettled = Boolean(token) && settledToken === token;

  const value = useMemo<GiverShareContextValue>(
    () => ({ token, meta, items, loading, fetchSettled, error, refresh, patchItem }),
    [error, fetchSettled, items, loading, meta, patchItem, refresh, token],
  );

  return <GiverShareContext.Provider value={value}>{children}</GiverShareContext.Provider>;
}

export function useGiverShare() {
  const value = use(GiverShareContext);
  if (!value) {
    throw new Error('useGiverShare must be used inside GiverShareProvider');
  }
  return value;
}