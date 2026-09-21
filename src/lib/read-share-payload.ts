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

type SharingApi = {
  getSharedPayloads: () => Parameters<typeof draftFromSharePayloads>[0];
  clearSharedPayloads: () => void;
};

/**
 * Load expo-sharing only when a share URL is actually being handled.
 * A top-level import calls requireNativeModule('ExpoSharing') while the root
 * layout is evaluated. If that module is missing, the throw is uncaught and
 * release builds abort on every cold start.
 */
function loadSharing(): SharingApi | null {
  try {
    const sharing = require('expo-sharing') as SharingApi;
    if (typeof sharing.getSharedPayloads !== 'function' || typeof sharing.clearSharedPayloads !== 'function') {
      return null;
    }
    return sharing;
  } catch {
    return null;
  }
}

/**
 * Copy the share extension payload into memory and clear it.
 * A link is the Add draft. An image is kept only when there is no link.
 * Call this only for an incoming `expo-sharing` URL. The native read is synchronous
 * and runs on the JS thread; an icon launch must not call it.
 */
export function stashNativeShare(): StashedShare {
  let url: string | null = null;
  let photo: SharedPhoto | null = null;
  try {
    const sharing = loadSharing();
    if (sharing) {
      const draft = draftFromSharePayloads(sharing.getSharedPayloads());
      url = draft.url;
      photo = draft.photo;
      if (url || photo) {
        try {
          sharing.clearSharedPayloads();
        } catch {
          // The in-memory copy is enough to open Add.
        }
      }
    }
  } catch {
    url = null;
    photo = null;
  }
  if (url) rememberPendingShareUrl(url);
  else if (photo) rememberPendingSharePhoto(photo);
  return {
    url: url ?? peekPendingShareUrl(),
    photo: url ? null : (photo ?? peekPendingSharePhoto()),
  };
}
