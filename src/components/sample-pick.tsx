import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { readAppPrefs, writeAppPrefs } from '@/lib/preferences';

/** Dismissible example on an empty list. Clearly labelled, not a real pick. */
export function SamplePick({ onDismiss }: { onDismiss?: () => void }) {
  const [gone, setGone] = useState(() => readAppPrefs().sampleDismissed);
  if (gone) return null;

  function dismiss() {
    writeAppPrefs({ sampleDismissed: true });
    setGone(true);
    onDismiss?.();
  }

  return (
    <Card accessibilityLabel="example-pick">
      <View style={styles.row}>
        <ThemedText type="eyebrow" themeColor="brand">
          Example
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Not a real pick
        </ThemedText>
      </View>
      <ThemedText type="heading">Pyjamas</ThemedText>
      <ThemedText themeColor="textSecondary">Peter Alexander</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        This is only here so an empty list isn’t blank. Dismiss it whenever you like.
      </ThemedText>
      <Button label="Dismiss" variant="secondary" onPress={dismiss} />
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
});
