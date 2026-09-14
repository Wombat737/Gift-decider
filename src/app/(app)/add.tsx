import { router } from 'expo-router';
import { useState } from 'react';
import { Switch, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { parseTags } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';

export default function AddItemScreen() {
  const theme = useTheme();
  const { addItem } = useWishlist();
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [buyUrl, setBuyUrl] = useState('');
  const [tags, setTags] = useState('');
  const [noSubstitution, setNoSubstitution] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSave() {
    setBusy(true);
    setError(null);
    try {
      const item = await addItem({
        title: title.trim() || 'Untitled gift',
        notes: notes.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
        buy_url: buyUrl.trim() || undefined,
        tags: parseTags(tags),
        no_substitution: noSubstitution,
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
        Photo + notes now. Optional buy URL later can become an affiliate — not in this scaffold.
      </ThemedText>

      <TextField label="Title" placeholder="The exact thing" value={title} onChangeText={setTitle} />
      <TextField
        label="Photo URL"
        placeholder="https://…"
        autoCapitalize="none"
        value={imageUrl}
        onChangeText={setImageUrl}
        hint="Camera + Storage upload is next. Paste a URL for the scaffold."
      />
      <TextField
        label="Notes"
        placeholder="Size, color, where you saw it"
        multiline
        value={notes}
        onChangeText={setNotes}
      />
      <TextField
        label="Buy URL (optional)"
        placeholder="https://…"
        autoCapitalize="none"
        value={buyUrl}
        onChangeText={setBuyUrl}
      />
      <TextField
        label="Tags"
        placeholder="kitchen, coffee"
        value={tags}
        onChangeText={setTags}
        hint="Comma-separated."
      />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <ThemedText>No substitutions</ThemedText>
        <Switch
          value={noSubstitution}
          onValueChange={setNoSubstitution}
          trackColor={{ true: theme.accent }}
        />
      </View>

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
