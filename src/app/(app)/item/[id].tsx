import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { Radius, Spacing } from '@/constants/theme';
import { statusLabel } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

export default function ItemDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useWishlist();
  const item = items.find((entry) => entry.id === id);

  if (!item) {
    return (
      <Screen>
        <ThemedText>That item is not on this list (or still loading).</ThemedText>
      </Screen>
    );
  }

  const tone =
    item.status === 'purchased' ? theme.success : item.status === 'reserved' ? theme.reserved : theme.accent;

  return (
    <Screen>
      <Image
        source={{ uri: item.image_url ?? 'https://picsum.photos/seed/giftdecider-empty/800/800' }}
        style={styles.image}
        contentFit="cover"
      />

      <View style={styles.block}>
        <ThemedText type="heading">{item.title || 'Untitled gift'}</ThemedText>
        <ThemedText type="smallBold" style={{ color: tone }}>
          {statusLabel(item.status)}
          {item.reserved_by ? ` · ${item.reserved_by}` : ''}
        </ThemedText>
      </View>

      {item.notes ? <ThemedText>{item.notes}</ThemedText> : null}

      {item.no_substitution ? (
        <ThemedText type="smallBold" themeColor="accent">
          No substitutions
        </ThemedText>
      ) : null}

      {item.tags.length > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {item.tags.join(' · ')}
        </ThemedText>
      ) : null}

      {item.source_url ? (
        <ThemedText type="small" themeColor="textSecondary">
          Source ({item.source_type}): {item.source_url}
        </ThemedText>
      ) : null}

      {item.buy_url ? (
        <Button label="Open buy link" variant="secondary" onPress={() => void Linking.openURL(item.buy_url!)} />
      ) : null}

      <ThemedText type="small" themeColor="textSecondary">
        Givers reserve or mark purchased from the shared link — this screen is the owner view.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    backgroundColor: '#E5D8C8',
  },
  block: {
    gap: Spacing.one,
  },
});
