import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { giverStatusLabel } from '@/lib/format';
import { improvisedConfidence } from '@/lib/improv';
import { linkNeedsHeal } from '@/lib/link-health';
import { isFunded } from '@/lib/pledges';
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
  const funded = showStatus && isFunded(item);
  const tone =
    funded || item.status === 'purchased'
      ? theme.success
      : item.status === 'reserved'
        ? theme.reserved
        : theme.accent;
  const confidence = showStatus ? improvisedConfidence(item) : null;

  const body = (
    <>
      <Image
        source={{ uri: item.image_url ?? 'https://picsum.photos/seed/giftdecider-empty/800/800' }}
        style={styles.image}
        contentFit="cover"
      />
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
          <ThemedText type="small" style={{ color: theme.success }} accessibilityLabel="from-the-group">
            From the group
          </ThemedText>
        ) : null}
        {showStatus ? (
          <ThemedText type="small" style={{ color: tone }}>
            {giverStatusLabel(item.status, funded)}
            {item.is_group_gift && !funded ? ' · group' : ''}
          </ThemedText>
        ) : null}
        {showStatus && linkNeedsHeal(item) ? (
          <ThemedText type="small" themeColor="accent">
            Link issue
          </ThemedText>
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
      <Link href={href} style={styles.card}>
        {body}
      </Link>
    );
  }

  return (
    <Pressable onPress={onPress} style={styles.card}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: Spacing.two,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: '#E5D8C8',
  },
  meta: {
    gap: 2,
    paddingHorizontal: 2,
  },
});
