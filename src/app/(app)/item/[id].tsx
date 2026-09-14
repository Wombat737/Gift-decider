import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FundedReveal } from '@/components/funded-reveal';
import { ItemFields, type ItemFieldsValue } from '@/components/item-fields';
import { NoSubLock } from '@/components/no-sub-lock';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { VibeChips } from '@/components/vibe-chips';
import { useWishlist } from '@/context/wishlist-context';
import { Radius, Spacing } from '@/constants/theme';
import { parseAud } from '@/lib/format';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, occasions, saveItem, refresh } = useWishlist();
  const item = items.find((entry) => entry.id === id);
  const occasion = occasions.find((row) => row.id === item?.occasion_id);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialFields = useMemo<ItemFieldsValue | null>(
    () =>
      item
        ? {
            title: item.title ?? '',
            notes: item.notes ?? '',
            imageUrl: item.image_url ?? '',
            buyUrl: item.buy_url ?? '',
            sizeHint: item.size_hint ?? '',
            targetAmount: item.target_amount != null ? String(item.target_amount) : '',
            tags: item.tags,
            itemKind: item.item_kind,
            noSubstitution: item.no_substitution,
            occasionId: item.occasion_id,
          }
        : null,
    [item],
  );
  const [fields, setFields] = useState<ItemFieldsValue | null>(null);
  const form = fields ?? initialFields;

  if (!item || !form) {
    return (
      <Screen>
        <ThemedText>That item is not on this list (or still loading).</ThemedText>
      </Screen>
    );
  }

  const current = item;
  const currentForm = form;

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      await saveItem(current.id, {
        title: currentForm.title.trim() || 'Untitled gift',
        notes: currentForm.notes.trim() || null,
        image_url: currentForm.imageUrl.trim() || null,
        buy_url: currentForm.buyUrl.trim() || null,
        tags: currentForm.tags,
        item_kind: currentForm.itemKind,
        size_hint: currentForm.sizeHint.trim() || null,
        target_amount: parseAud(currentForm.targetAmount),
        occasion_id: currentForm.occasionId,
        no_substitution: currentForm.noSubstitution,
      });
      setEditing(false);
      setFields(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save item');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Image
        source={{ uri: item.image_url ?? 'https://picsum.photos/seed/giftdecider-empty/800/800' }}
        style={styles.image}
        contentFit="cover"
      />

      {editing ? (
        <>
          <ItemFields
            value={form}
            occasions={occasions}
            onChange={(patch) => setFields({ ...form, ...patch })}
          />
          {error ? (
            <ThemedText type="small" themeColor="accent">
              {error}
            </ThemedText>
          ) : null}
          <Button label={busy ? 'Saving…' : 'Save vibes'} disabled={busy} onPress={() => void onSave()} />
          <Button
            label="Cancel"
            variant="ghost"
            onPress={() => {
              setEditing(false);
              setFields(null);
            }}
          />
        </>
      ) : (
        <>
          <View style={styles.block}>
            <ThemedText type="heading">{item.title || 'Untitled gift'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.item_kind === 'vibe' ? 'Taste / vibe' : 'Exact item'}
              {occasion ? ` · ${occasion.title}` : ''}
            </ThemedText>
          </View>

          {item.notes ? <ThemedText>{item.notes}</ThemedText> : null}
          {item.size_hint ? (
            <ThemedText type="small" themeColor="textSecondary">
              Size / fit: {item.size_hint}
            </ThemedText>
          ) : null}
          {item.target_amount != null ? (
            <ThemedText type="small" themeColor="textSecondary">
              Target (if friends chip in): ${item.target_amount}
            </ThemedText>
          ) : null}

          {item.no_substitution ? <NoSubLock /> : null}

          {item.tags.length > 0 ? <VibeChips tags={item.tags} /> : null}

          <FundedReveal item={item} />

          {item.source_url ? (
            <ThemedText type="small" themeColor="textSecondary">
              Source ({item.source_type}): {item.source_url}
            </ThemedText>
          ) : null}

          <Button label="Edit item / vibes" variant="secondary" onPress={() => setEditing(true)} />
        </>
      )}
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
