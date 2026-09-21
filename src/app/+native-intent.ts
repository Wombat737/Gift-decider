import { getSharedPayloads } from 'expo-sharing';

import { isIncomingSharePath, rememberPendingShareUrl, urlFromSharePayloads } from '@/lib/share-intent';

/** Share extension opens `giftdecider://expo-sharing`. Land on Add with the URL filled in. */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  void initial;
  try {
    if (!isIncomingSharePath(path)) return path;
    let shared: string | null = null;
    try {
      shared = urlFromSharePayloads(getSharedPayloads());
    } catch {
      shared = null;
    }
    if (shared) {
      rememberPendingShareUrl(shared);
      return `/add?url=${encodeURIComponent(shared)}`;
    }
    return '/add?share=1';
  } catch {
    return path || '/';
  }
}
