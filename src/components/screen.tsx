import { use, type ReactNode } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewProps,
} from 'react-native';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DemoBanner } from '@/components/demo-banner';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
  /** Mounted as a sibling of ScrollView, not inside it. Use for primary CTAs. */
  footer?: ReactNode;
};

function useKeyboardVerticalOffset() {
  const headerHeight = use(HeaderHeightContext);
  return Platform.OS === 'ios' ? (headerHeight ?? 0) : 0;
}

export function Screen({ children, style, scroll = true, padded = true, footer, ...rest }: ScreenProps) {
  const theme = useTheme();
  const keyboardVerticalOffset = useKeyboardVerticalOffset();
  const body = (
    <View
      {...rest}
      // Fabric may flatten this wrapper into the ScrollView content UIView.
      // That UIView is viewport-tall; overflowing Pressables then miss hits.
      collapsable={false}
      style={[styles.inner, padded && styles.padded, style]}>
      <DemoBanner />
      {children}
    </View>
  );

  // Identical to PR #16 unless a footer is passed. Add-gift / share must keep
  // that ScrollView tree so keyboard dismiss and KAV padding stay intact.
  const scrollView = (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scroll}
      // handled = tap-outside dismisses unless a child (button/input)
      // claimed the tap. always left the keyboard stuck on add/share.
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      onScrollBeginDrag={Keyboard.dismiss}
      nestedScrollEnabled
      removeClippedSubviews={false}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}>
      {body}
    </ScrollView>
  );

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['bottom', 'left', 'right']}>
        <KeyboardAvoidingView
          style={styles.avoid}
          enabled={Platform.OS === 'ios'}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}>
          {scroll ? (footer ? <View collapsable={false} style={styles.scrollSlot}>{scrollView}</View> : scrollView) : body}
          {footer ? (
            <View
              collapsable={false}
              style={[
                styles.footerDock,
                {
                  borderTopColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}>
              <View collapsable={false} style={[styles.footerInner, padded && styles.footerPadded]}>
                {footer}
              </View>
            </View>
          ) : null}
        </KeyboardAvoidingView>
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
  avoid: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
    minHeight: 0,
  },
  // Wrapper so RNW ScrollView cannot expand over the footer sibling.
  scrollSlot: {
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
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
  //
  // Do not flexGrow this box. On iOS Fabric the content container's native
  // frame stays viewport-tall, so the gift image + wrapped copy overflow it
  // and every Pressable below the fold (soft-lock, sign-in, add, share) misses
  // the hit test — TestFlight 0.4.0 (11) reported all buttons dead.
  scroll: {
    width: '100%',
    maxWidth: '100%',
    alignItems: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
  },
  // Content-sized column. flexGrow: 1 here made inner as tall as the viewport
  // while wrapped text + the gift image overflowed. iOS Fabric then skipped
  // hits on Pressables below the fold — soft-lock looked dead.
  inner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    alignSelf: 'center',
    gap: Spacing.three + 2,
  },
  padded: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    paddingBottom: Spacing.five,
  },
  footerDock: {
    width: '100%',
    maxWidth: '100%',
    flexGrow: 0,
    flexShrink: 0,
    zIndex: 2,
    elevation: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    pointerEvents: 'auto',
  },
  footerInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    minWidth: 0,
    alignSelf: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  footerPadded: {
    paddingHorizontal: Spacing.four,
  },
});
