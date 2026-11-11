import { useWishlist } from '@/context/wishlist-context';

/** Owner home data. Kept out of the home screen so that file stays surprise-safe. */
export function useOwnerLists() {
  const data = useWishlist();
  return {
    items: data.items,
    occasions: data.occasions,
    list: data.wishlist,
    loading: data.loading,
    error: data.error,
    refresh: data.refresh,
  };
}
