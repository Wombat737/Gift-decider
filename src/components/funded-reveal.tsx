import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { formatContributorList } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';

export function FundedReveal({ item }: { item: WishlistItem }) {
  const reveal = item.reveal;
  if (!reveal) return null;

  const who = formatContributorList(reveal.contributors);

  return (
    <ThemedView type="backgroundElement" style={styles.card} accessibilityLabel="funded-group-reveal">
      <ThemedText type="smallBold">It’s from the group</ThemedText>
      <ThemedText>
        {reveal.contributors.length === 0
          ? 'Friends chipped in together on this one.'
          : `Who chipped in: ${who}.`}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        This only shows once the group gift is funded — not while it’s in flight.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
