import { peekPendingSharePhoto, peekPendingShareUrl, type SharedPhoto } from '@/lib/share-intent';

export type StashedShare = {
  url: string | null;
  photo: SharedPhoto | null;
};

/**
 * iOS cold open must not load the share-into native module.
 * Paste and /add?url= use the in-memory pending value.
 */
export function stashNativeShare(): StashedShare {
  return {
    url: peekPendingShareUrl(),
    photo: peekPendingSharePhoto(),
  };
}
