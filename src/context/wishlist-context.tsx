import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { useAuth } from '@/context/auth-context';
import type { NewWishlistItem, Occasion, UpdateWishlistItem, Wishlist, WishlistItem } from '@/lib/types';
import {
  createItem,
  createOccasion,
  deleteOwnedItem,
  getOwnedWishlist,
  listOwnedItems,
  listOwnedOccasions,
  updateOwnedItem,
} from '@/services/wishlist';

type WishlistContextValue = {
  wishlist: Wishlist | null;
  items: WishlistItem[];
  occasions: Occasion[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addItem: (input: NewWishlistItem) => Promise<WishlistItem>;
  saveItem: (itemId: string, patch: UpdateWishlistItem) => Promise<WishlistItem>;
  removeItem: (itemId: string) => Promise<void>;
  addOccasion: (title: string) => Promise<Occasion>;
};

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setWishlist(null);
      setItems([]);
      setOccasions([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextWishlist, nextItems, nextOccasions] = await Promise.all([
        getOwnedWishlist(),
        listOwnedItems(),
        listOwnedOccasions(),
      ]);
      setWishlist(nextWishlist);
      setItems(nextItems);
      setOccasions(nextOccasions);
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
      occasions,
      loading,
      error,
      refresh,
      async addItem(input) {
        const item = await createItem(input);
        setItems((current) => [item, ...current.filter((existing) => existing.id !== item.id)]);
        return item;
      },
      async saveItem(itemId, patch) {
        const item = await updateOwnedItem(itemId, patch);
        setItems((current) => current.map((existing) => (existing.id === item.id ? item : existing)));
        return item;
      },
      async removeItem(itemId) {
        await deleteOwnedItem(itemId);
        setItems((current) => current.filter((existing) => existing.id !== itemId));
      },
      async addOccasion(title) {
        const occasion = await createOccasion(title);
        setOccasions((current) => [...current.filter((row) => row.id !== occasion.id), occasion]);
        return occasion;
      },
    }),
    [error, items, loading, occasions, refresh, wishlist],
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
