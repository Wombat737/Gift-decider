import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { VibeChips } from '@/components/vibe-chips';
import { Spacing } from '@/constants/theme';
import { MAX_TASTE_TAGS, normalizeTasteTag, normalizeTasteTags } from '@/lib/giver-social';

type TasteTagEditorProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
};

/** Recipient-only wrap chips for editing taste tags. Do not mount on giver browse. */
export function TasteTagEditor({ tags, onChange }: TasteTagEditorProps) {
  const [draft, setDraft] = useState('');

  function addDraft() {
    const tag = normalizeTasteTag(draft);
    if (!tag) return;
    onChange(normalizeTasteTags([...tags, tag]));
    setDraft('');
  }

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold">Taste tags</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Givers search these — they never see the chips. Lowercase, 30 max.
      </ThemedText>
      {tags.length > 0 ? (
        <VibeChips tags={tags} selected={tags} onToggle={(tag) => onChange(tags.filter((entry) => entry !== tag))} />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No tags yet. Try linen, trail running, no candles.
        </ThemedText>
      )}
      <TextField
        label="Add a tag"
        value={draft}
        onChangeText={setDraft}
        placeholder="linen"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={addDraft}
        hint={tags.length >= MAX_TASTE_TAGS ? 'That’s 30 — remove one to add another.' : undefined}
      />
      <Button label="Add tag" variant="secondary" onPress={addDraft} disabled={!draft.trim() || tags.length >= MAX_TASTE_TAGS} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
  },
});
