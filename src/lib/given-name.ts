/**
 * Greeting name. A real first word from display_name, otherwise a guess from
 * the email local part. Never a dotted handle such as "Wade.curedale".
 */

function presentFirstName(token: string) {
  return token
    .split('-')
    .map((part) => {
      if (!part) return part;
      if (part !== part.toLowerCase() && part !== part.toUpperCase()) return part;
      const lower = part.toLowerCase();
      return lower[0].toUpperCase() + lower.slice(1);
    })
    .join('-');
}

/** Email local parts and handles: dots, underscores, digits, or an @. */
export function looksLikeEmailOrHandle(raw: string | null | undefined) {
  const token = (raw ?? '').trim();
  if (!token) return true;
  if (token.includes('@')) return true;
  if (/[._]/.test(token)) return true;
  if (/\d/.test(token)) return true;
  if (/[+/=]/.test(token)) return true;
  return false;
}

/** First word of display_name when it is a name, not an email or handle. */
export function givenNameFromDisplay(displayName?: string | null) {
  const first = (displayName ?? '').trim().split(/\s+/).filter(Boolean)[0];
  if (!first || looksLikeEmailOrHandle(first)) return null;
  return presentFirstName(first);
}

/** Last resort: "wade.curedale" / "wade_42" / "wade-home" → "Wade". */
export function firstNameFromEmail(email?: string | null) {
  const local = (email ?? '').trim().split('@')[0] ?? '';
  if (!local || local.includes(' ')) return null;
  const token = local.split(/[._\-\d]+/).filter((part) => /[a-z]/i.test(part))[0];
  if (!token) return null;
  return presentFirstName(token);
}

export function greetingFirstName(input: { displayName?: string | null; email?: string | null }) {
  return givenNameFromDisplay(input.displayName) ?? firstNameFromEmail(input.email);
}

export function needsGivenNamePrompt(displayName?: string | null) {
  return givenNameFromDisplay(displayName) == null;
}

/** First name to store on profiles.display_name. Null when it is still a handle. */
export function givenNameToSave(raw: string | null | undefined) {
  const first = (raw ?? '').trim().split(/\s+/)[0] ?? '';
  if (!first || first.length > 40 || looksLikeEmailOrHandle(first)) return null;
  return presentFirstName(first);
}

type GivenNameListener = () => void;
const listeners = new Set<GivenNameListener>();

export function subscribeGivenName(listener: GivenNameListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyGivenNameSaved() {
  for (const listener of listeners) listener();
}
