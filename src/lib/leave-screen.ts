import { router, type Href } from 'expo-router';

import { queuePickPulse } from '@/lib/pick-pulse';
import { exitAction, picksHref } from '@/lib/stack-exit';

/** Pop local or parent history. A stack root (no history) goes home instead of sticking. */
export function leaveScreen(fallback: Href = picksHref) {
  if (exitAction(router.canGoBack(), router.canDismiss()) === 'back') {
    router.back();
    return;
  }
  router.replace(fallback);
}

/**
 * After a pin, land on home. dismissTo pops back when home is still under Add;
 * if Add replaced home, it replaces the dead-end with home.
 */
export function returnToPicks(itemId: string) {
  queuePickPulse(itemId);
  router.dismissTo({ pathname: picksHref, params: { fresh: itemId } });
}
