import { router } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { ItemFields, type ItemFieldsValue } from '@/components/item-fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { parseAud } from '@/lib/format';

const emptyFields: ItemFieldsValue = {
  title: '',
  notes: '',
  imageUrl: '',
  buyUrl: '',
  sizeHint: '',
  targetAmount: '',
  tags: [],
  itemKind: 'exact',
  noSubstitution: false,
  occasionId: null,
};

export default function AddItemScreen() {
  const { addItem, occasions } = useWishlist();
  const [fields, setFields] = useState<ItemFieldsValue>(emptyFields);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      const item = await addItem({
        title: fields.title.trim() || 'Untitled gift',
        notes: fields.notes.trim() || undefined,
        image_url: fields.imageUrl.trim() || undefined,
        buy_url: fields.buyUrl.trim() || undefined,
        tags: fields.tags,
        item_kind: fields.itemKind,
        size_hint: fields.sizeHint.trim() || null,
        target_amount: parseAud(fields.targetAmount),
        occasion_id: fields.occasionId,
        no_substitution: fields.noSubstitution,
        source_type: 'manual',
      });
      router.replace(`/item/${item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add item');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">
        Pin an exact SKU or a taste/vibe. Givers see the board; they won’t tell you what they reserved.
      </ThemedText>

      <ItemFields value={fields} occasions={occasions} onChange={(patch) => setFields((current) => ({ ...current, ...patch }))} />

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      <Button label={busy ? 'Saving…' : 'Pin to wishlist'} disabled={busy} onPress={() => void onSave()} />
      <Button label="Or paste an Instagram URL" variant="ghost" onPress={() => router.push('/paste')} />
    </Screen>
  );
}
