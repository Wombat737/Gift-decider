import { Card } from '@/components/card';
import { HeroWash } from '@/components/hero-wash';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { PrettyCopy } from '@/lib/copy';
import { formatContributorList, formatRevealDate } from '@/lib/pledges';
import { ownerMomentTone } from '@/lib/tones';
import type { WishlistItem } from '@/lib/types';
import { StyleSheet } from 'react-native';

export function FundedReveal({ item }: { item: WishlistItem }) {
  const reveal = item.reveal;
  if (!reveal) return null;

  const who = formatContributorList(reveal.contributors);
  const when = formatRevealDate(reveal.reveal_at);
  const tone = ownerMomentTone();

  return (
    <Card padded={false} accessibilityLabel="funded-group-reveal">
      <HeroWash variant="hero" style={styles.wash}>
        <ThemedText type="eyebrow" themeColor={tone}>
          From the group
        </ThemedText>
        <ThemedText type="moment">{PrettyCopy.revealDay}</ThemedText>
        <ThemedText>
          {reveal.contributors.length === 0
            ? 'Friends chipped in together on this one.'
            : `Who chipped in: ${who}.`}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          This shows on the reveal date givers picked ({when}) — not as soon as the group gift is funded.
        </ThemedText>
      </HeroWash>
    </Card>
  );
}

const styles = StyleSheet.create({
  wash: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
});
