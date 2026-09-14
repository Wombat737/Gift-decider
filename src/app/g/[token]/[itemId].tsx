import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { statusLabel } from '@/lib/format';
import type { ItemStatus, WishlistItem } from '@/lib/types';
import { getSharedItems, setSharedItemStatus } from '@/services/wishlist';
import { useTheme } from '@/hooks/use-theme';

export default function GiverItemScreen() {
  const theme = useTheme();
  const { token, itemId } = useLocalSearchParams<{ token: string; itemId: string }>();
  const [item, setItem] = useState<WishlistItem | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || !itemId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await getSharedItems(token);
      setItem(items.find((entry) => entry.id === itemId) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this gift');
    } finally {
      setLoading(false);
    }
  }, [itemId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(status: ItemStatus) {
    if (!token || !item) return;
    setError(null);
    try {
      setItem(await setSharedItemStatus(token, item.id, status, name.trim() || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update item');
    }
  }

  if (loading && !item) {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading gift…</ThemedText>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <ThemedText>That gift is not on this shared list.</ThemedText>
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
      {item.buy_url ? (
        <Button label="Open buy link" variant="ghost" onPress={() => void Linking.openURL(item.buy_url!)} />
      ) : null}

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}
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
