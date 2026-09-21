import { clearSharedPayloads, getSharedPayloads } from 'expo-sharing';

import { consumePendingShareUrl, urlFromSharePayloads } from '@/lib/share-intent';

/** Native share payloads, else a URL remembered during cold start. Clears the extension payload. */
export function takeIncomingShareUrl(): string | null {
  let fromNative: string | null = null;
  try {
    fromNative = urlFromSharePayloads(getSharedPayloads());
  } catch {
    fromNative = null;
  }
  if (fromNative) {
    try {
      clearSharedPayloads();
    } catch {
      // Still open Add. A later resume may see the same payload once.
    }
  }
  const pending = consumePendingShareUrl();
  return fromNative ?? pending;
}
