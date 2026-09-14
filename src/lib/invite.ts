export function mateInviteMessage(link: string, occasionTitle?: string | null) {
  const occasion = occasionTitle?.trim() ? ` (${occasionTitle.trim()})` : '';
  return [
    `You're picking a gift${occasion} from a photo wishlist — vibes, AU helpers, no spoilers for them.`,
    '',
    link,
  ].join('\n');
}
