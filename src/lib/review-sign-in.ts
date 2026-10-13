/**
 * App Store review accounts that may sign in with a password.
 * Every other address stays on the emailed magic link.
 */
export const REVIEW_SIGN_IN_EMAILS = ['review@meantvo.app', 'giver-review@meantvo.app'] as const;

export type ReviewSignInEmail = (typeof REVIEW_SIGN_IN_EMAILS)[number];

/** Canonical allow-listed email, or null when this address must use the magic link. */
export function reviewSignInEmail(email: string): ReviewSignInEmail | null {
  const normalized = email.trim().toLowerCase();
  for (const allowed of REVIEW_SIGN_IN_EMAILS) {
    if (allowed === normalized) return allowed;
  }
  return null;
}
