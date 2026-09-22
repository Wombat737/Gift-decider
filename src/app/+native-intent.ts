import { stashNativeShare } from '@/lib/read-share-payload';
import { isIncomingSharePath } from '@/lib/share-intent';

/** Share extension opens `giftdecider://expo-sharing`. Land on Add with the link or photo filled in. */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  void initial;
  try {
    // Icon launch is `giftdecider:///` (or empty). Do not touch the native share
    // module unless this open actually came from the share extension.
    if (!isIncomingSharePath(path)) return path;
    const draft = stashNativeShare();
    if (draft.url) return `/add?url=${encodeURIComponent(draft.url)}`;
    if (draft.photo) return '/add?photo=1';
    return '/add?share=1';
  } catch {
    return path || '/';
  }
}
