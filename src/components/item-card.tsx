import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { giverStatusChip } from '@/lib/giver-status';
import { HEAL_BADGE, shouldRenderHealUi } from '@/lib/heal-link';
import { improvisedConfidence } from '@/lib/improv';
import { ownerMomentTone } from '@/lib/tones';
import type { WishlistItem } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

type ItemCardProps = {
  item: WishlistItem;
  href?: Href;
  onPress?: () => void;
  /** Giver-only. Owners never see reserve/purchased/pledges — surprise gifts. */
  showStatus?: boolean;
};

export function ItemCard({ item, href, onPress, showStatus = false }: ItemCardProps) {
  const theme = useTheme();
  const confidence = showStatus ? improvisedConfidence(item) : null;
  const revealTone = ownerMomentTone();
  const statusChip = showStatus ? giverStatusChip(item) : null;

  const body = (
    <>
      <View style={[styles.imageWrap, { backgroundColor: theme.paper }]}>
        <Image
          source={{ uri: item.image_url ?? 'https://picsum.photos/seed/giftdecider-empty/800/800' }}
          style={styles.image}
          contentFit="cover"
        />
      </View>
      <View style={styles.meta}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {item.no_substitution ? '🔒 ' : ''}
          {item.title || 'Untitled gift'}
        </ThemedText>
        {item.item_kind === 'vibe' ? (
          <ThemedText type="small" themeColor="textSecondary">
            Vibe
          </ThemedText>
        ) : null}
        {item.tags.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {item.tags.join(' · ')}
          </ThemedText>
        ) : null}
        {item.reveal ? (
          <ThemedText type="momentSmall" themeColor={revealTone} accessibilityLabel="from-the-group">
            From the group
          </ThemedText>
        ) : null}
        {statusChip ? <StatusChip label={statusChip.label} tone={statusChip.tone} /> : null}
        {showStatus && shouldRenderHealUi('giver', item) ? (
          <StatusChip label={HEAL_BADGE} tone="brand" />
        ) : null}
        {confidence ? (
          <ThemedText type="small" themeColor="textSecondary">
            {confidence.label}
          </ThemedText>
        ) : null}
      </View>
    </>
  );

  if (href) {
    return (
      <Link href={href} asChild>
        <Pressable style={styles.press} accessibilityRole="link">
          <Card padded={false} style={styles.card}>
            {body}
          </Card>
        </Pressable>
      </Link>
    );
  }

  return (
    <Pressable onPress={onPress} style={styles.press}>
      <Card padded={false} style={styles.card}>
        {body}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  press: {
    flex: 1,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  card: {
    flex: 1,
    gap: 0,
    padding: Spacing.two,
    paddingBottom: Spacing.one,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 1,
    overflow: 'hidden',
    borderRadius: Radius.card - 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  meta: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
  },
});
