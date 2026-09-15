import { StyleSheet } from 'react-native';

import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { HEAL_BADGE, shouldRenderHealUi } from '@/lib/heal-link';
import type { WishlistItem } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

/** Giver-only list banner. Owners must never render this. */
export function DeadLinkBanner({ items }: { items: WishlistItem[] }) {
  const theme = useTheme();
  const broken = items.filter((item) => shouldRenderHealUi('giver', item));
  if (broken.length === 0) return null;

  return (
    <Card
      accessibilityLabel="giver-dead-link-banner"
      style={[styles.card, { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft }]}>
      <ThemedText type="eyebrow" themeColor="brand">
        Givers only
      </ThemedText>
      <ThemedText type="smallBold" accessibilityLabel="link-may-be-broken">
        {HEAL_BADGE}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {broken.map((item) => item.title || 'Untitled gift').join(' · ')}. Open the gift to check the link or see
        AU alternatives. They won’t see this.
      </ThemedText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
