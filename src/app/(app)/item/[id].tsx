import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { FundedReveal } from '@/components/funded-reveal';
import { GiftPhoto } from '@/components/gift-photo';
import { ItemFields, type ItemFieldsValue } from '@/components/item-fields';
import { NoSubLock } from '@/components/no-sub-lock';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { VibeChips } from '@/components/vibe-chips';
import { useWishlist } from '@/context/wishlist-context';
import { Spacing } from '@/constants/theme';
import { confirmDestructive } from '@/lib/confirm';
import { PrettyCopy } from '@/lib/copy';
import { formatAudQuiet, parseAud } from '@/lib/format';
import { giverPriceAmount } from '@/lib/giver-list';
import { noSubstitutionForSave } from '@/lib/item-form';
import { leaveScreen } from '@/lib/leave-screen';
import { presentNotes } from '@/lib/link-preview';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, occasions, saveItem, removeItem, refresh } = useWishlist();
  const item = items.find((entry) => entry.id === id);
  const occasion = occasions.find((row) => row.id === item?.occasion_id);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoHeld, setPhotoHeld] = useState(false);
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
  const formRef = useRef<ItemFieldsValue | null>(null);

  if (!item || !form) {
    return (
      <Screen>
        <ThemedText>That pick isn’t here yet.</ThemedText>
      </Screen>
    );
  }

  const current = item;
  const currentForm = form;
  const notes = presentNotes(item.notes);
  const priceAmount = giverPriceAmount(item);

  async function onRemove() {
    const ok = await confirmDestructive(PrettyCopy.removeGiftTitle, PrettyCopy.removeGiftBody, PrettyCopy.removeGift);
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await removeItem(current.id);
      leaveScreen();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove item');
      setBusy(false);
    }
  }

  async function onSave() {
    if (photoHeld || photoBusy) {
      setError('The photo is still uploading. Retry it, or remove it, before saving.');
      return;
    }
    const saving = formRef.current ?? currentForm;
    setBusy(true);
    setError(null);
    try {
      await saveItem(current.id, {
        title: saving.title.trim() || 'Untitled gift',
        notes: saving.notes.trim() || null,
        image_url: saving.imageUrl.trim() || null,
        buy_url: saving.buyUrl.trim() || null,
        tags: saving.tags,
        item_kind: saving.itemKind,
        size_hint: saving.sizeHint.trim() || null,
        target_amount: parseAud(saving.targetAmount),
        occasion_id: saving.occasionId,
        no_substitution: noSubstitutionForSave(saving.itemKind, saving.noSubstitution),
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
      {!editing ? (
          <GiftPhoto uri={item.image_url} />
      ) : null}

      {editing ? (
        <>
          <ItemFields
            value={form}
            occasions={occasions}
            onChange={(patch) => {
              const next = { ...(formRef.current ?? form), ...patch };
              formRef.current = next;
              setFields(next);
            }}
            onPhotoBusy={setPhotoBusy}
            onPhotoHold={setPhotoHeld}
          />
          {error ? (
            <ThemedText type="small" themeColor="accent">
              {error}
            </ThemedText>
          ) : null}
          <Button
            label={busy ? 'Saving…' : PrettyCopy.savePick}
            disabled={busy || photoBusy || photoHeld}
            onPress={() => void onSave()}
          />
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
            <ThemedText type="eyebrow" themeColor="brand">
              {item.reveal ? 'From the group' : 'Mates’ picks stay hidden'}
            </ThemedText>
            <ThemedText type="heading">{item.title || 'Untitled gift'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.item_kind === 'vibe' ? 'Taste / vibe' : 'Exact item'}
              {occasion ? ` · ${occasion.title}` : ''}
            </ThemedText>
          </View>

          {notes ? (
            <View style={styles.notesWrap}>
              <ThemedText style={styles.notes}>{notes}</ThemedText>
            </View>
          ) : null}
          {item.size_hint ? (
            <ThemedText type="small" themeColor="textSecondary">
              Size / fit: {item.size_hint}
            </ThemedText>
          ) : null}
          {priceAmount != null ? (
            <View style={styles.block}>
              <ThemedText type="small" themeColor="textSecondary">
                Price: {formatAudQuiet(priceAmount)}
              </ThemedText>
              <ThemedText type="caption" themeColor="textSecondary">
                Also the target when people share the cost.
              </ThemedText>
            </View>
          ) : null}

          {item.no_substitution ? <NoSubLock /> : null}

          {item.tags.length > 0 ? <VibeChips tags={item.tags} /> : null}

          <FundedReveal item={item} />

          {item.source_url ? (
            <ThemedText type="small" themeColor="textSecondary">
              Source ({item.source_type}): {item.source_url}
            </ThemedText>
          ) : null}

          <Button
            label={PrettyCopy.editPick}
            variant="secondary"
            onPress={() => {
              formRef.current = form;
              setEditing(true);
            }}
          />
          <Button
            label={busy ? 'Removing…' : PrettyCopy.removeGift}
            variant="ghost"
            disabled={busy}
            onPress={() => void onRemove()}
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.one,
  },
  // A definite width so the last line wraps instead of clipping mid-sentence.
  notesWrap: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
  },
  notes: {
    width: '100%',
  },
});
