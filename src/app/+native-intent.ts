import { getSharedPayloads } from 'expo-sharing';

import {
  draftFromSharePayloads,
  isIncomingSharePath,
  rememberPendingSharePhoto,
  rememberPendingShareUrl,
} from '@/lib/share-intent';

/** Share extension opens `giftdecider://expo-sharing`. Land on Add with the link or photo filled in. */
export function redirectSystemPath({ path, initial }: { path: string; initial: boolean }): string {
  void initial;
  try {
    if (!isIncomingSharePath(path)) return path;
    let url: string | null = null;
    let photo = false;
    try {
      const draft = draftFromSharePayloads(getSharedPayloads());
      url = draft.url;
      photo = Boolean(draft.photo);
      if (draft.url) rememberPendingShareUrl(draft.url);
      else if (draft.photo) rememberPendingSharePhoto(draft.photo);
    } catch {
      url = null;
      photo = false;
    }
    if (url) return `/add?url=${encodeURIComponent(url)}`;
    if (photo) return '/add?photo=1';
    return '/add?share=1';
  } catch {
    return path || '/';
  }
}
