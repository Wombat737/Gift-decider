import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { GivenNamePrompt } from '@/components/given-name-prompt';
import { NativePressable } from '@/components/native-pressable';
import { Screen } from '@/components/screen';
import { StagePickRow } from '@/components/stage-pick-row';
import { StageStickyHeader } from '@/components/stage-sticky-header';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { PrettyCopy } from '@/lib/copy';
import { clearPickPulse, peekPickPulse } from '@/lib/pick-pulse';
import { PICK_PULSE_MS } from '@/lib/stage-home';

function oneParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default function OwnerHomeScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ fresh?: string | string[] }>();
  const { items, loading, error, refresh } = useWishlist();
  const [pulseId, setPulseId] = useState<string | null>(null);
  const announcedPulse = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const listTop = useRef(0);
  const pulseY = useRef<number | null>(null);
  const scrolledPulse = useRef('');
  const fresh = oneParam(params.fresh).trim();

  useFocusEffect(
    useCallback(() => {
      const nextPulse = peekPickPulse() || fresh || null;
      if (nextPulse) setPulseId(nextPulse);
      void refresh();
    }, [fresh, refresh]),
  );

  const rowReady = Boolean(pulseId && items.some((item) => item.id === pulseId));

  useEffect(() => {
    if (!pulseId || !rowReady) return;
    if (announcedPulse.current !== pulseId) {
      announcedPulse.current = pulseId;
      AccessibilityInfo.announceForAccessibility(PrettyCopy.pickAdded);
    }
    const timer = setTimeout(() => {
      clearPickPulse(pulseId);
      setPulseId((current) => (current === pulseId ? null : current));
    }, PICK_PULSE_MS + 80);
    return () => clearTimeout(timer);
  }, [pulseId, rowReady]);

  function scrollPulse(yInList = pulseY.current) {
    if (!pulseId || yInList == null) return;
    pulseY.current = yInList;
    const target = Math.max(0, listTop.current + yInList - Spacing.three);
    const key = `${pulseId}:${Math.round(target)}`;
    if (scrolledPulse.current === key) return;
    scrolledPulse.current = key;
    scrollRef.current?.scrollTo({ y: target, animated: true });
  }

  return (
    <Screen
      scrollRef={scrollRef}
      sticky={
        <View style={{ paddingTop: insets.top }}>
          <StageStickyHeader title={PrettyCopy.ownerHomeTitle} />
        </View>
      }>
      <Stack.Screen options={{ headerShown: false, title: PrettyCopy.ownerHomeTitle }} />

      <GivenNamePrompt />

      <View style={styles.actions}>
        <Button label={PrettyCopy.ownerEmptyCta} onPress={() => router.push('/add')} />
        <NativePressable
          accessibilityRole="link"
          accessibilityLabel={PrettyCopy.ownerShareLink}
          onPress={() => {
            track('share_screen_opened');
            router.push('/share');
          }}
          style={styles.shareLink}>
          <ThemedText type="bodyEm" themeColor="textSecondary" style={styles.shareLabel}>
            {PrettyCopy.ownerShareLink}
          </ThemedText>
        </NativePressable>
      </View>

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      {loading && items.length === 0 ? <ThemedText themeColor="textSecondary">Loading…</ThemedText> : null}

      {items.length > 0 ? (
        <View
          style={styles.list}
          onLayout={(event) => {
            listTop.current = event.nativeEvent.layout.y;
            scrollPulse();
          }}>
          <ThemedText type="eyebrow" themeColor="textSecondary">
            {PrettyCopy.ownerSection}
          </ThemedText>
          {items.map((item) => (
            <StagePickRow
              key={item.id}
              item={item}
              href={`/item/${item.id}`}
              pulse={item.id === pulseId}
              onPulseLayout={item.id === pulseId ? scrollPulse : undefined}
            />
          ))}
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <View style={styles.empty}>
          <ThemedText type="title" style={styles.emptyTitle}>
            {PrettyCopy.ownerEmptyTitle}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
            {PrettyCopy.ownerEmptyBody}
          </ThemedText>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.twoHalf,
  },
  shareLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  shareLabel: {
    textAlign: 'center',
  },
  list: {
    gap: Spacing.three,
  },
  empty: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  emptyTitle: {
    letterSpacing: -0.4,
  },
  emptyBody: {
    maxWidth: 320,
  },
});
