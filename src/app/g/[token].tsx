import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ItemCard } from '@/components/item-card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { ItemStatus, SharedWishlist, WishlistItem } from '@/lib/types';
import { getSharedItems, getSharedWishlist, setSharedItemStatus } from '@/services/wishlist';

export default function GiverShareScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [meta, setMeta] = useState<SharedWishlist | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState('');
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

  const selected = items.find((item) => item.id === selectedId) ?? null;

  async function updateStatus(status: ItemStatus) {
    if (!token || !selected) return;
    setError(null);
    try {
      const next = await setSharedItemStatus(token, selected.id, status, name.trim() || undefined);
      setItems((current) => current.map((item) => (item.id === next.id ? next : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update item');
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="heading">{meta?.title ?? 'Shared wishlist'}</ThemedText>
        <ThemedText themeColor="textSecondary">
          {meta
            ? `For ${meta.owner_display_name || meta.owner_handle || 'a friend'}. Reserve so nobody doubles up.`
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
            <ItemCard item={item} onPress={() => setSelectedId(item.id)} />
          </View>
        ))}
      </View>

      {selected ? (
        <View style={styles.detail}>
          {selected.image_url ? (
            <Image source={{ uri: selected.image_url }} style={styles.image} contentFit="cover" />
          ) : null}
          <ThemedText type="subtitle">{selected.title}</ThemedText>
          {selected.notes ? <ThemedText>{selected.notes}</ThemedText> : null}
          {selected.no_substitution ? (
            <ThemedText type="smallBold" themeColor="accent">
              They asked for this exact thing
            </ThemedText>
          ) : null}
          <TextField
            label="Your name (optional)"
            placeholder="So they know who grabbed it"
            value={name}
            onChangeText={setName}
          />
          <Button label="Reserve this" onPress={() => void updateStatus('reserved')} />
          <Button label="Mark purchased" variant="secondary" onPress={() => void updateStatus('purchased')} />
          <Button label="Release hold" variant="ghost" onPress={() => void updateStatus('available')} />
          {selected.buy_url ? (
            <Button label="Open buy link" variant="ghost" onPress={() => void Linking.openURL(selected.buy_url!)} />
          ) : null}
        </View>
      ) : items.length > 0 ? (
        <ThemedText themeColor="textSecondary">Tap a photo to reserve or mark it bought.</ThemedText>
      ) : null}
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
  detail: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  image: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: 16,
    backgroundColor: '#E5D8C8',
  },
});
