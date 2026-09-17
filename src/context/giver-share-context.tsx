import { useLocalSearchParams } from 'expo-router';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { patchGiverCatalog, shareTokenParam, writeGiverCatalog } from '@/lib/giver-catalog';
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
  error: string | null;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  patchItem: (item: WishlistItem) => void;
};

const GiverShareContext = createContext<GiverShareContextValue | null>(null);

export function GiverShareProvider({ children }: PropsWithChildren) {
  const params = useLocalSearchParams<{ token: string }>();
  const token = shareTokenParam(params.token);
  const { user } = useAuth();
  const [meta, setMeta] = useState<SharedWishlist | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!token) {
        setMeta(null);
        setItems([]);
        setError('This share link is missing a token.');
        setLoading(false);
        return;
      }
      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const [nextMeta, nextItems] = await Promise.all([getSharedWishlist(token), getSharedItems(token)]);
        setMeta(nextMeta);
        setItems(nextItems);
        writeGiverCatalog(token, nextItems);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not open this list');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  const value = useMemo<GiverShareContextValue>(
    () => ({ token, meta, items, loading, error, refresh, patchItem }),
    [error, items, loading, meta, patchItem, refresh, token],
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
