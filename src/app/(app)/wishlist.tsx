import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { NativePressable } from '@/components/native-pressable';
import { Screen } from '@/components/screen';
import { StagePickRow } from '@/components/stage-pick-row';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { PrettyCopy } from '@/lib/copy';
import { personFirstLabel } from '@/lib/list-title';
import { stageGreeting } from '@/lib/stage-home';
import { getOwnProfile } from '@/services/profile';

export default function OwnerHomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, error, refresh } = useWishlist();
  const [firstName, setFirstName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void getOwnProfile()
        .then((profile) => {
          setFirstName(personFirstLabel(profile?.display_name, profile?.handle));
        })
        .catch(() => {
          setFirstName(null);
        });
    }, [refresh]),
  );

  const initial = (firstName ?? 'G').slice(0, 1).toUpperCase();

  return (
    <Screen demoBanner={false} style={{ paddingTop: insets.top + Spacing.two }}>
      <Stack.Screen options={{ headerShown: false, title: PrettyCopy.ownerHomeTitle }} />
      <View style={styles.topBar}>
        <ThemedText type="smallBold">Gift Decider</ThemedText>
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel="Me"
          onPress={() => router.replace('/settings')}
          style={[styles.avatarHit, { backgroundColor: theme.brandSoft }]}>
          <ThemedText style={[styles.avatarLetter, { color: theme.brandInk }]}>{initial}</ThemedText>
        </NativePressable>
      </View>

      <View style={styles.hero}>
        <ThemedText themeColor="textSecondary">{stageGreeting(firstName)}</ThemedText>
        <ThemedText type="display" style={styles.heroTitle} accessibilityRole="header">
          {PrettyCopy.ownerHomeTitle}
        </ThemedText>
      </View>

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

      {loading ? <ThemedText themeColor="textSecondary">Loading…</ThemedText> : null}

      {!loading && items.length > 0 ? (
        <View style={styles.list}>
          <ThemedText type="eyebrow" themeColor="textSecondary">
            {PrettyCopy.ownerSection}
          </ThemedText>
          {items.map((item) => (
            <StagePickRow key={item.id} item={item} href={`/item/${item.id}`} />
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  avatarHit: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  avatarLetter: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 700,
  },
  hero: {
    gap: Spacing.one,
  },
  heroTitle: {
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -1,
  },
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
