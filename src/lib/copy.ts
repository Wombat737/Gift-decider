/** Matey pretty-pass copy. Short, Aussie-warm, no corporate. */
export const PrettyCopy = {
  splash: 'Gifts without the guesswork.',
  signInSub: 'Lists for you · easy for the mates buying.',
  ownerEmptyTitle: 'What are you after, legend?',
  ownerEmptyBody: 'Pin a photo, a vibe, or a link. Mates pick from the share — you stay unspoiled.',
  ownerEmptyCta: 'Add a gift',
  ownerEmptySecondary: 'Add from a link',
  giverEmptyTitle: 'Quiet list — nudge them to add a couple of bits.',
  giverEmptyBody: 'Nothing here yet — ask them to add a few bits.',
  giverEmptyCta: 'Remind them',
  shareTitle: 'Send this to whoever’s buying.',
  shareSubtitle:
    'Share with the mates buying for you. Friends open a read-only link. You won’t see what they reserved, pledged, or bought.',
  shareCta: 'Share',
  chipInCta: 'Chip in',
  chipInHonour: 'PayID on honour — tick off what you’ve sent.',
  softLock: 'You’ve got this one.',
  purchasedGiver: 'Bought — nice one.',
  revealDay: 'The mates chipped in — here’s who.',
} as const;

export function mateNudgeMessage() {
  return 'Your Gift Decider list is quiet — add a few bits so we can buy?';
}
