/** Owner home. Kept as a path string so screens can leave without naming the route inline. */
export const picksHref = '/wishlist' as const;

/**
 * Pop when this stack or a parent still has history (canDismiss covers a nested
 * screen the root ref does not count as canGoBack). Otherwise replace home.
 */
export function exitAction(canGoBack: boolean, canDismiss: boolean): 'back' | 'home' {
  if (canGoBack || canDismiss) return 'back';
  return 'home';
}
