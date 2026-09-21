import { clearSharedPayloads, getSharedPayloads } from 'expo-sharing';

import {
  draftFromSharePayloads,
  peekPendingSharePhoto,
  peekPendingShareUrl,
  rememberPendingSharePhoto,
  rememberPendingShareUrl,
  type SharedPhoto,
} from '@/lib/share-intent';

export type StashedShare = {
  url: string | null;
  photo: SharedPhoto | null;
};

/**
 * Copy the share extension payload into memory and clear it.
 * A link is the Add draft. An image is kept only when there is no link.
 */
export function stashNativeShare(): StashedShare {
  let url: string | null = null;
  let photo: SharedPhoto | null = null;
  try {
    const draft = draftFromSharePayloads(getSharedPayloads());
    url = draft.url;
    photo = draft.photo;
  } catch {
    url = null;
    photo = null;
  }
  if (url) rememberPendingShareUrl(url);
  else if (photo) rememberPendingSharePhoto(photo);
  if (url || photo) {
    try {
      clearSharedPayloads();
    } catch {
      // The in-memory copy is enough to open Add.
    }
  }
  return {
    url: url ?? peekPendingShareUrl(),
    photo: url ? null : (photo ?? peekPendingSharePhoto()),
  };
}
