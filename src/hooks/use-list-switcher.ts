import { router } from 'expo-router';

import { openLastGiverShare } from '@/lib/giver-catalog';
import { prefetchSharedItems } from '@/services/wishlist';

/** YOUR LIST | GIVER VIEW pills: owner list vs last opened giver share. */
export function useListSwitcher() {
  function goYourList() {
    router.push('/wishlist');
  }

  function goGiverView() {
    if (!openLastGiverShare(router.push, prefetchSharedItems, () => router.push('/people'))) {
      return;
    }
  }

  return { goYourList, goGiverView };
}
