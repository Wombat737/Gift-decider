import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { MeantvoHeaderMark } from '@/components/meantvo-mark';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { writeAppPrefs } from '@/lib/preferences';

const PAGES = [
  {
    title: 'Your lists',
    body: 'Add the things you’d like. The people buying never see who is getting what.',
  },
  {
    title: 'A photo and a name',
    body: 'A picture and a title is enough. A shop link can fill the rest, and you can turn that off.',
  },
  {
    title: 'Send it when you’re ready',
    body: 'Share a link, or copy the list as plain text. You stay out of who reserved what.',
  },
];

/** Two or three short screens, once, with a skip. */
export function FirstRun({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const current = PAGES[page] ?? PAGES[0];
  const last = page >= PAGES.length - 1;

  function finish() {
    writeAppPrefs({ introSeen: true });
    onDone();
  }

  return (
    <View style={[styles.scrim, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.three, paddingBottom: insets.bottom + Spacing.three }]}>
      <MeantvoHeaderMark />
      <ThemedText type="eyebrow" themeColor="textSecondary">
        {page + 1} of {PAGES.length}
      </ThemedText>
      <ThemedText type="display">{current.title}</ThemedText>
      <ThemedText themeColor="textSecondary">{current.body}</ThemedText>
      <View style={styles.actions}>
        <Button label={last ? 'Start' : 'Next'} onPress={() => (last ? finish() : setPage((value) => value + 1))} />
        <Button label="Skip" variant="ghost" onPress={finish} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    zIndex: 30,
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    justifyContent: 'center',
  },
  actions: {
    gap: Spacing.two,
    marginTop: Spacing.three,
  },
});
