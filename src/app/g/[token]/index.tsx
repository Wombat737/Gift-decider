import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ItemCard } from '@/components/item-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { SharedWishlist, WishlistItem } from '@/lib/types';
import { getSharedItems, getSharedWishlist } from '@/services/wishlist';

export default function GiverShareScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [meta, setMeta] = useState<SharedWishlist | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || token === 'undefined') {
      setMeta(null);
      setItems([]);
      setError('This share link is missing a token.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextMeta, nextItems] = await Promise.all([getSharedWishlist(token), getSharedItems(token)]);
      setMeta(nextMeta);
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this list');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="heading">{meta?.title ?? 'Shared wishlist'}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {meta
            ? `For ${meta.owner_display_name || meta.owner_handle || 'a friend'}. Tap a photo to reserve or mark it bought.`
            : loading
              ? 'Opening link…'
              : 'This share token did not match a list.'}
        </ThemedText>
      </View>

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.cell}>
            <ItemCard item={item} href={`/g/${token}/${item.id}`} showStatus />
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.one,
  },
  cell: {
    width: '50%',
    padding: Spacing.one,
  },
});
