import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { MeantvoHeaderMark } from '@/components/meantvo-mark';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { writeAppPrefs } from '@/lib/preferences';

const PAGES = [
  {
    title: 'Pin what you’d love',
    body: 'Add a pick, then send the list to whoever is buying. You won’t see what they reserved.',
  },
  {
    title: 'Title first',
    body: 'Name the gift, then add a photo or a buy link. Filling from a shop link can be turned off in Me.',
  },
  {
    title: 'Share the cost',
    body: 'When a gift is for the group, mates can share the cost. Copy the list as plain text if a link is confusing.',
  },
] as const;

/** Three skippable screens, shown once. Uses the existing coral type and buttons. */
export function FirstRun({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const current = PAGES[page];
  const last = page === PAGES.length - 1;

  function finish() {
    writeAppPrefs({ introSeen: true });
    onDone();
  }

  return (
    <View style={[styles.overlay, { backgroundColor: theme.background }]} accessibilityLabel="first-run">
      <MeantvoHeaderMark />
      <ThemedText type="eyebrow" themeColor="brand">
        {page + 1} of {PAGES.length}
      </ThemedText>
      <ThemedText type="title">{current.title}</ThemedText>
      <ThemedText themeColor="textSecondary">{current.body}</ThemedText>
      <View style={styles.actions}>
        <Button label={last ? 'Start' : 'Next'} onPress={() => (last ? finish() : setPage((value) => value + 1))} />
        {last ? null : <Button label="Skip" variant="ghost" onPress={finish} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
});
