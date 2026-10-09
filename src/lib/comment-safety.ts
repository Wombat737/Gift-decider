/** Basic objectionable-language list shared with the post/edit RPCs. Whole words only. */

export const OBJECTIONABLE_COMMENT_MESSAGE =
  "Please rephrase that. We don't allow abusive language.";

export const TERMS_REQUIRED_MESSAGE = 'Agree to the Terms before commenting.';

export const COMMENT_REPORT_REASONS = [
  { id: 'harassment', label: 'Harassment or bullying' },
  { id: 'hate', label: 'Hate or a slur' },
  { id: 'sexual', label: 'Sexual content' },
  { id: 'spam', label: 'Spam' },
  { id: 'other', label: 'Something else' },
] as const;

export type CommentReportReason = (typeof COMMENT_REPORT_REASONS)[number]['id'];

export const BANNED_COMMENT_WORDS = [
  'fuck',
  'fucking',
  'fucked',
  'fucker',
  'motherfucker',
  'shit',
  'shitty',
  'bullshit',
  'bitch',
  'bitches',
  'asshole',
  'arsehole',
  'bastard',
  'dick',
  'dickhead',
  'cock',
  'pussy',
  'cunt',
  'whore',
  'slut',
  'nigger',
  'nigga',
  'faggot',
  'fag',
  'retard',
  'retarded',
  'tranny',
  'kike',
  'spic',
  'chink',
  'fck',
  'fuk',
  'fuq',
  'fock',
] as const;

const BANNED = new Set<string>(BANNED_COMMENT_WORDS);

function leet(input: string) {
  return input
    .toLowerCase()
    .replace(/@/g, 'a')
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/\$/g, 's');
}

function collapseRepeats(token: string) {
  return token.replace(/(.)\1+/g, '$1');
}

function spacedTokens(body: string) {
  const spaced = leet(body)
    .replace(/[^a-z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced ? spaced.split(' ') : [];
}

/** Pull separators out from between letters so "f*ck" and "f.u.c.k" are tokens. */
function squeezedTokens(body: string) {
  let squeezed = leet(body);
  let previous = '';
  while (squeezed !== previous) {
    previous = squeezed;
    squeezed = squeezed.replace(/([a-z])[^a-z]([a-z])/g, '$1$2');
  }
  const spaced = squeezed
    .replace(/[^a-z]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return spaced ? spaced.split(' ') : [];
}

function singleLetterChunks(tokens: string[]) {
  const chunks: string[] = [];
  let letters = '';
  for (const token of tokens) {
    if (token.length === 1) {
      letters += token;
      continue;
    }
    if (letters.length >= 3) chunks.push(letters);
    letters = '';
  }
  if (letters.length >= 3) chunks.push(letters);
  return chunks;
}

function isBanned(token: string) {
  return BANNED.has(token) || BANNED.has(collapseRepeats(token));
}

export function commentBodyIsObjectionable(body: string) {
  const spaced = spacedTokens(body);
  const tokens = [...spaced, ...squeezedTokens(body), ...singleLetterChunks(spaced)];
  return tokens.some((token) => isBanned(token));
}

export function isCommentReportReason(value: string): value is CommentReportReason {
  return COMMENT_REPORT_REASONS.some((reason) => reason.id === value);
}
