import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { formatContributorList, formatRevealDate } from '@/lib/pledges';
import { ownerMomentTone } from '@/lib/tones';
import type { WishlistItem } from '@/lib/types';

export function FundedReveal({ item }: { item: WishlistItem }) {
  const reveal = item.reveal;
  if (!reveal) return null;

  const who = formatContributorList(reveal.contributors);
  const when = formatRevealDate(reveal.reveal_at);
  const tone = ownerMomentTone();

  return (
    <Card accessibilityLabel="funded-group-reveal">
      <ThemedText type="eyebrow" themeColor={tone}>
        From the group
      </ThemedText>
      <ThemedText type="moment">It’s from the group</ThemedText>
      <ThemedText>
        {reveal.contributors.length === 0
          ? 'Friends chipped in together on this one.'
          : `Who chipped in: ${who}.`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        This shows on the reveal date givers picked ({when}) — not as soon as the group gift is funded.
      </ThemedText>
    </Card>
  );
}
