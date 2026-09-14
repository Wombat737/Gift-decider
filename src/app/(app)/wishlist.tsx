import { router, Stack, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/button';
import { FilterChips } from '@/components/vibe-chips';
import { FlowHeader } from '@/components/flow-header';
import { ItemGrid } from '@/components/item-grid';
import { LegalLinks } from '@/components/legal-links';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { useWishlist } from '@/context/wishlist-context';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';

export default function WishlistGridScreen() {
  const { user } = useAuth();
  const { items, occasions, loading, error, refresh } = useWishlist();
  const [occasionId, setOccasionId] = useState('all');

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const visible = useMemo(() => {
    if (occasionId === 'all') return items;
    if (occasionId === 'none') return items.filter((item) => !item.occasion_id);
    return items.filter((item) => item.occasion_id === occasionId);
  }, [items, occasionId]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => {
                track('settings_opened', { source: 'wishlist_header' });
                router.push('/settings');
              }}
              hitSlop={12}
              style={styles.headerBtn}>
              <ThemedText type="smallBold" themeColor="accent">
                Settings
              </ThemedText>
            </Pressable>
          ),
        }}
      />
      <FlowHeader
        role="owner"
        title="What you actually want"
        subtitle={`Photo-first list for ${user?.email ?? 'you'}. Friends pick from a share link — you won’t see reserves, pledges, or who bought what. Group gifts stay unspoiled until the reveal date.`}
      />

      <View style={styles.actions}>
        <Button label="Add item" onPress={() => router.push('/add')} />
        <Button label="Paste Instagram URL" variant="secondary" onPress={() => router.push('/paste')} />
        <Button
          label="Share / occasions"
          variant="ghost"
          onPress={() => {
            track('share_screen_opened');
            router.push('/share');
          }}
        />
      </View>

      {occasions.length > 0 ? (
        <FilterChips
          options={[
            { id: 'all', label: 'All' },
            ...occasions.map((row) => ({ id: row.id, label: row.title })),
            { id: 'none', label: 'Unassigned' },
          ]}
          value={occasionId}
          onChange={setOccasionId}
        />
      ) : null}

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      {loading ? <ThemedText themeColor="textSecondary">Loading…</ThemedText> : null}

      {!loading ? (
        <ItemGrid
          items={visible}
          hrefFor={(item) => `/item/${item.id}`}
          emptyTitle="Nothing pinned yet"
          emptyBody="Add a photo, a vibe, or paste a public Instagram URL. Givers only see what you share."
          emptyActionLabel="Add item"
          onEmptyAction={() => router.push('/add')}
        />
      ) : null}

      <LegalLinks includeSettings />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.two,
  },
  headerBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
