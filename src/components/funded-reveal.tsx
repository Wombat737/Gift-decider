import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { formatContributorList } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';

export function FundedReveal({ item }: { item: WishlistItem }) {
  const reveal = item.reveal;
  if (!reveal) return null;

  const who = formatContributorList(reveal.contributors);

  return (
    <Card accessibilityLabel="funded-group-reveal">
      <ThemedText type="eyebrow" themeColor="success">
        Funded
      </ThemedText>
      <ThemedText type="smallBold">It’s from the group</ThemedText>
      <ThemedText>
        {reveal.contributors.length === 0
          ? 'Friends chipped in together on this one.'
          : `Who chipped in: ${who}.`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        This only shows once the group gift is funded — not while it’s in flight.
      </ThemedText>
    </Card>
  );
}
