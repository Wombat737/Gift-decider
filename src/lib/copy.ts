/** Matey pretty-pass copy. Short, Aussie-warm, no corporate. */
export const PrettyCopy = {
  splash: 'Gifts without the guesswork.',
  signInSub: 'Lists for you · easy for the mates buying.',
  ownerEmptyTitle: 'What moves you?',
  ownerEmptyBody: 'Add bits that feel like you…',
  ownerEmptyCta: 'Add a pick',
  ownerHomeTitle: 'Your lists',
  ownerSection: 'Also in this issue',
  ownerShareLink: 'Send to whoever’s choosing',
  previewGiverLink: 'Preview giver view',
  givenNamePrompt: 'What should we call you?',
  givenNameBody: 'A first name, so the greeting isn’t your email.',
  givenNameSave: 'Save',
  pickAdded: 'Added to your picks',
  editPick: 'Edit pick',
  savePick: 'Save pick',
  giverEmptyTitle: 'Quiet picks',
  giverEmptyBody: 'Ask them to add a few bits that feel like them.',
  giverEmptyCta: 'Nudge them',
  giverHeadline: 'They’re set · you decide',
  giverHomeIntro: 'A few things that feel like them. Pick one — or share the cost with the mates.',
  giverChooseCta: 'Choose this',
  giverSoftLockCta: 'Mark soft-locked',
  giverChoosing: 'Choosing',
  shareTitle: 'Send this to whoever’s buying.',
  shareSubtitle: 'You won’t see what they reserved.',
  shareCta: 'Share',
  shareWithMates: 'Share with mates',
  shareAdvanced: 'Advanced',
  claimCta: 'I’ll get this',
  claimNameLabel: 'Your name',
  claimNameMissing: 'Add your name — other givers won’t see it.',
  claimHint: 'Other givers see Reserved or Bought — not your name.',
  readyToBuyHint: 'Pledges hit the target. The organiser should buy it.',
  claimTaken: 'Already reserved — take it?',
  releaseReservation: 'Release reservation',
  chipInCta: 'Share the cost',
  chipInHonour: 'PayID on honour — tick off what you’ve sent.',
  softLock: 'You’ve got this one.',
  purchasedGiver: 'Bought — nice one.',
  revealDay: 'The mates shared the cost — here’s who.',
  peopleTitle: 'People you buy for',
  peopleEmptyTitle: 'Who are you buying for?',
  peopleEmptyBody:
    'Search their handle or email. Pin is private — you only see gifts after they accept.',
  peopleCta: 'Add someone',
  requestsTitle: 'Giver requests',
  requestsBannerCta: 'Review requests',
  removeGift: 'Remove from picks',
  removeGiftTitle: 'Remove this pick?',
  removeGiftBody: 'Mates will no longer see it after they refresh. You can add it again later.',
  commentsHint: 'Only other givers see this — not them.',
  copyAsText: 'Copy as text',
  autofillSetting: 'Fill in from shop links',
} as const;

export function cantSeeLine(name?: string | null) {
  const who = (name ?? '').trim() || 'They';
  return `${who} can’t see who’s getting what.`;
}

export function mateNudgeMessage() {
  return 'Your Meantvo list is quiet — add a few bits so we can buy?';
}
