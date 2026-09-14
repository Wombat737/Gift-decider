import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/context/auth-context';
import { demoWishlist } from '@/lib/demo-store';
import type { NewWishlistItem, Wishlist, WishlistItem } from '@/lib/types';
import { createItem, getOwnedWishlist, listOwnedItems } from '@/services/wishlist';

type WishlistContextValue = {
  wishlist: Wishlist | null;
  items: WishlistItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (input: NewWishlistItem) => Promise<WishlistItem>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<Wishlist | null>(user ? demoWishlist : null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setWishlist(null);
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextWishlist, nextItems] = await Promise.all([getOwnedWishlist(), listOwnedItems()]);
      setWishlist(nextWishlist);
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load wishlist');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<WishlistContextValue>(
    () => ({
      wishlist,
      items,
      loading,
      error,
      refresh,
      async addItem(input) {
        const item = await createItem(input);
        setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);
        return item;
      },
    }),
    [error, items, loading, refresh, wishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const value = use(WishlistContext);
  if (!value) {
    throw new Error('useWishlist must be used inside WishlistProvider');
  }
  return value;
}
