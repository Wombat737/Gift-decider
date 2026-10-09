import { useGlobalSearchParams, useLocalSearchParams } from 'expo-router';

import { useAuth } from '@/context/auth-context';
import { useWishlist } from '@/context/wishlist-context';
import { usesDemoData } from '@/lib/app-mode';
import { isOwnerPreviewParam, shouldSanitizeOwnerPreview } from '@/lib/owner-preview';

/** True when this giver route must hide reservations, pledges, and comments. */
export function useOwnerPreview(token: string | undefined): boolean {
  const local = useLocalSearchParams<{ preview?: string | string[] }>();
  const global = useGlobalSearchParams<{ preview?: string | string[] }>();
  const { user } = useAuth();
  const { wishlist, occasions } = useWishlist();
  const previewParam = isOwnerPreviewParam(local.preview) || isOwnerPreviewParam(global.preview);
  return shouldSanitizeOwnerPreview({
    previewParam,
    token,
    ownTokens: [wishlist?.share_token, ...occasions.map((occasion) => occasion.share_token)],
    demo: Boolean(user?.demo) || usesDemoData(),
  });
}
