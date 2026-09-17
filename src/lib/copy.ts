/** Matey pretty-pass copy. Short, Aussie-warm, no corporate. */
export const PrettyCopy = {
  ownerEmptyTitle: 'What are you after?',
  ownerEmptyBody: 'Pin a photo, a vibe, or a link. Mates pick from the share — you stay unspoiled.',
  ownerEmptyCta: 'Add a gift',
  ownerEmptySecondary: 'Add from a link',
  giverEmptyTitle: 'Their list is quiet — nudge them to add a few things.',
  giverEmptyBody: 'Nothing here yet — ask them to add a few bits.',
  giverEmptyCta: 'Remind them',
  shareTitle: 'Send this to whoever’s buying.',
  shareSubtitle:
    'Share with the mates buying for you. Friends open a read-only link. You won’t see what they reserved, pledged, or bought.',
  shareCta: 'Share',
  chipInHonour: 'PayID on honour — mark what you’ve sent.',
} as const;

export function mateNudgeMessage() {
  return 'Your Gift Decider list is quiet — add a few bits so we can buy?';
}
