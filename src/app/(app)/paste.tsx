import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { FlowHeader } from '@/components/flow-header';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useListSwitcher } from '@/hooks/use-list-switcher';
import type { LinkPreview } from '@/lib/types';
import { previewFunctionHint, previewUrl } from '@/services/preview';

export default function PasteInstagramScreen() {
  const theme = useTheme();
  const { goYourList, goGiverView } = useListSwitcher();
  const { addItem } = useWishlist();
  const [url, setUrl] = useState('https://www.instagram.com/p/DEMO_STUB/');
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPreview() {
    setBusy(true);
    setError(null);
    try {
      setPreview(await previewUrl(url));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  async function onPin() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const item = await addItem({
        title: preview.title ?? 'Instagram find',
        notes: preview.description ?? undefined,
        image_url: preview.image_url ?? undefined,
        source_type: preview.provider === 'instagram' ? 'instagram' : 'url',
        source_url: preview.url,
      });
      router.replace(`/item/${item.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not pin item');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <FlowHeader
        role="owner"
        title="Paste a public post"
        subtitle="Instagram v1: preview a stub, pin it, add vibes after. No Meta OAuth, no Saves API, no scrapers."
        onYourList={goYourList}
        onGiverView={goGiverView}
      />

      <TextField
        label="Public Instagram URL"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="https://www.instagram.com/p/…"
        value={url}
        onChangeText={setUrl}
        hint={previewFunctionHint()}
      />

      <Button label={busy ? 'Working…' : 'Preview stub'} disabled={busy} onPress={() => void onPreview()} />

      {preview ? (
        <Card padded={false} style={styles.preview}>
          {preview.image_url ? (
            <Image source={{ uri: preview.image_url }} style={[styles.image, { backgroundColor: theme.paper }]} contentFit="cover" />
          ) : null}
          <View style={styles.meta}>
            <ThemedText type="smallBold">{preview.stub ? 'Stub preview' : 'Preview'}</ThemedText>
            <ThemedText type="subtitle">{preview.title}</ThemedText>
            {preview.description ? (
              <ThemedText themeColor="textSecondary">{preview.description}</ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              {preview.url}
            </ThemedText>
            <Button label="Pin as wishlist item" onPress={() => void onPin()} disabled={busy} />
          </View>
        </Card>
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
  preview: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  image: {
    width: '100%',
    aspectRatio: 1,
  },
  meta: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
});
