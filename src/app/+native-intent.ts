import { stashNativeShare } from '@/lib/read-share-payload';
import { isIncomingSharePath } from '@/lib/share-intent';

/** Android share-into opens `giftdecider://expo-sharing`. iOS has no share extension. */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  void initial;
  try {
    // Icon launch is `giftdecider:///` (or empty). On iOS, stashNativeShare does
    // not load expo-sharing. On Android it reads the share intent only for this path.
    if (!isIncomingSharePath(path)) return path;
    const draft = stashNativeShare();
    if (draft.url) return `/add?url=${encodeURIComponent(draft.url)}`;
    if (draft.photo) return '/add?photo=1';
    return '/add?share=1';
  } catch {
    return path || '/';
  }
}
