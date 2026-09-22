import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button } from '@/components/button';
import { ItemFields, type ItemFieldsValue } from '@/components/item-fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { parseAud } from '@/lib/format';
import { isInstagramHost, sanitizeBuyUrl } from '@/lib/link-preview';

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

function queryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function AddItemScreen() {
  const params = useLocalSearchParams<{ url?: string }>();
  const initialUrl = sanitizeBuyUrl(queryValue(params.url)) ?? '';
  return <AddDraft key={initialUrl || 'new'} initialUrl={initialUrl} />;
}

function AddDraft({ initialUrl }: { initialUrl: string }) {
  const { addItem, occasions } = useWishlist();
  const [fields, setFields] = useState<ItemFieldsValue>({ ...emptyFields, buyUrl: initialUrl });
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      const buyUrl = fields.buyUrl.trim();
      const cleaned = sanitizeBuyUrl(buyUrl);
      let instagram = false;
      if (cleaned) {
        try {
          instagram = isInstagramHost(new URL(cleaned).hostname);
        } catch {
          instagram = false;
        }
      }
      const item = await addItem({
        title: fields.title.trim() || 'Untitled gift',
        notes: fields.notes.trim() || undefined,
        image_url: fields.imageUrl.trim() || undefined,
        buy_url: buyUrl || undefined,
        tags: fields.tags,
        item_kind: fields.itemKind,
        size_hint: fields.sizeHint.trim() || null,
        target_amount: parseAud(fields.targetAmount),
        occasion_id: fields.occasionId,
        no_substitution: fields.noSubstitution,
        source_type: instagram ? 'instagram' : 'manual',
        source_url: instagram ? buyUrl : undefined,
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
      <ItemFields
        value={fields}
        occasions={occasions}
        onChange={(patch) => setFields((current) => ({ ...current, ...patch }))}
        onPhotoBusy={setPhotoBusy}
        autofillBuyUrl
      />

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      <Button
        label={busy ? 'Saving…' : 'Pin to wishlist'}
        icon="add"
        disabled={busy || photoBusy}
        onPress={() => void onSave()}
      />
      <Button label="Or paste an Instagram URL" variant="ghost" onPress={() => router.push('/paste')} />
    </Screen>
  );
}
