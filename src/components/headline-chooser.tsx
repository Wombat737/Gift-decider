import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { headlineSuggestions } from '@/lib/headlines';

type HeadlineChooserProps = {
  listName: string;
  value: string | null;
  onChange: (headline: string | null) => void;
};

/** Suggestions stay drafts until the owner taps one, edits it, or skips. */
export function HeadlineChooser({ listName, value, onChange }: HeadlineChooserProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState(value ?? '');
  const suggestions = headlineSuggestions(listName);

  return (
    <View style={styles.wrap}>
      <ThemedText type="eyebrow" themeColor="textSecondary">
        Headline
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Optional. The list name stays underneath. Nothing is used until you choose it.
      </ThemedText>
      {suggestions.map((suggestion) => (
        <NativePressable
          key={suggestion.id}
          accessibilityRole="button"
          accessibilityLabel={`Use headline ${suggestion.text.replace(/\*/g, '')}`}
          onPress={() => {
            setDraft(suggestion.text);
            onChange(suggestion.text);
          }}
          style={styles.hit}>
          <ThemedText type="bodyEm" style={{ color: theme.brand }}>
            {suggestion.text.replace(/\*/g, '')}
          </ThemedText>
        </NativePressable>
      ))}
      <TextField
        label="Your headline"
        value={draft}
        onChangeText={setDraft}
        placeholder="The big day"
        autoCapitalize="sentences"
      />
      <View style={styles.row}>
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel="Use this headline"
          onPress={() => onChange(draft.trim() || null)}
          style={styles.hit}>
          <ThemedText type="bodyEm">Use this</ThemedText>
        </NativePressable>
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel="Skip headline"
          onPress={() => {
            setDraft('');
            onChange(null);
          }}
          style={styles.hit}>
          <ThemedText type="bodyEm" themeColor="textSecondary">
            Skip
          </ThemedText>
        </NativePressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  hit: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
