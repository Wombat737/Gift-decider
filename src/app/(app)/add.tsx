import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { ItemFields, type ItemFieldsValue } from '@/components/item-fields';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { parseAud } from '@/lib/format';
import { noSubstitutionForSave } from '@/lib/item-form';
import { returnToPicks } from '@/lib/leave-screen';
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
  noSubstitution: true,
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
  const fieldsRef = useRef(fields);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoHeld, setPhotoHeld] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patchFields(patch: Partial<ItemFieldsValue>) {
    const next = { ...fieldsRef.current, ...patch };
    fieldsRef.current = next;
    setFields(next);
  }

  async function onSave() {
    if (photoHeld || photoBusy) {
      setError('The photo is still uploading. Retry it, or remove it, before saving.');
      return;
    }
    setBusy(true);
    setError(null);
    const current = fieldsRef.current;
    try {
      const buyUrl = current.buyUrl.trim();
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
        title: current.title.trim() || 'Untitled gift',
        notes: current.notes.trim() || undefined,
        image_url: current.imageUrl.trim() || undefined,
        buy_url: buyUrl || undefined,
        tags: current.tags,
        item_kind: current.itemKind,
        size_hint: current.sizeHint.trim() || null,
        target_amount: parseAud(current.targetAmount),
        occasion_id: current.occasionId,
        no_substitution: noSubstitutionForSave(current.itemKind, current.noSubstitution),
        source_type: instagram ? 'instagram' : 'manual',
        source_url: instagram ? buyUrl : undefined,
      });
      returnToPicks(item.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add item');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      wash={
        <LinearGradient
          colors={['#E4DCCC', '#F3EFE6', '#F3EFE6'] as const}
          locations={[0, 0.42, 1] as const}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      }>
      <ItemFields
        value={fields}
        occasions={occasions}
        onChange={patchFields}
        onPhotoBusy={setPhotoBusy}
        onPhotoHold={setPhotoHeld}
        autofillBuyUrl
        cards
      />

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      <Button
        label={busy ? 'Saving…' : 'Pin to wishlist'}
        icon="add"
        disabled={busy || photoBusy || photoHeld}
        onPress={() => void onSave()}
      />
      <Button label="Or paste an Instagram URL" variant="ghost" onPress={() => router.push('/paste')} />
    </Screen>
  );
}
