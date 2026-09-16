import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DemoBanner } from '@/components/demo-banner';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
};

export function Screen({ children, style, scroll = true, padded = true, ...rest }: ScreenProps) {
  const body = (
    <View style={[styles.inner, padded && styles.padded, style]} {...rest}>
      <DemoBanner />
      {children}
    </View>
  );

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        {scroll ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}>
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  safe: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  scrollView: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  // Width must be the viewport, not the content. alignItems: 'center' on an
  // unbounded ScrollView makes % widths fail and text stay on one line — the
  // page then grows to the longest sentence (feels zoomed-in on iPhone).
  scroll: {
    flexGrow: 1,
    width: '100%',
    maxWidth: '100%',
    alignItems: 'stretch',
  },
  // Content-sized column. flexGrow: 1 here made inner as tall as the viewport
  // while wrapped text + the gift image overflowed. iOS Fabric then skipped
  // hits on Pressables below the fold — soft-lock looked dead.
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    minWidth: 0,
    alignSelf: 'center',
    gap: Spacing.three + 2,
  },
  padded: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.five,
  },
});
