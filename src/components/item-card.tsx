import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { statusLabel } from '@/lib/format';
import type { WishlistItem } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

type ItemCardProps = {
  item: WishlistItem;
  href?: Href;
  onPress?: () => void;
  /** Giver-only. Owners never see reserve/purchased — surprise gifts. */
  showStatus?: boolean;
};

export function ItemCard({ item, href, onPress, showStatus = false }: ItemCardProps) {
  const theme = useTheme();
  const tone =
    item.status === 'purchased' ? theme.success : item.status === 'reserved' ? theme.reserved : theme.accent;

  const body = (
    <>
      <Image
        source={{ uri: item.image_url ?? 'https://picsum.photos/seed/giftdecider-empty/800/800' }}
        style={styles.image}
        contentFit="cover"
      />
      <View style={styles.meta}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {item.title || 'Untitled gift'}
        </ThemedText>
        {showStatus ? (
          <ThemedText type="small" style={{ color: tone }}>
            {statusLabel(item.status)}
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
