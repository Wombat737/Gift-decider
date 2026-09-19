import { router, Stack, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/button';
import { FilterChips } from '@/components/vibe-chips';
import { FlowHeader } from '@/components/flow-header';
import { HeaderInboxLink } from '@/components/inbox-badge';
import { InboxBanner } from '@/components/inbox-banner';
import { ItemGrid } from '@/components/item-grid';
import { LegalLinks } from '@/components/legal-links';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useWishlist } from '@/context/wishlist-context';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { PrettyCopy } from '@/lib/copy';
import { acceptBannerText, requestBannerText } from '@/lib/inbox';

export default function WishlistGridScreen() {
  const { user } = useAuth();
  const { items, occasions, loading, error, refresh } = useWishlist();
  const { pendingRequests, newlyReady, requests, refreshInbox } = useInbox();
  const [occasionId, setOccasionId] = useState('all');
  const requestCopy = requestBannerText(requests);
  const readyCopy = acceptBannerText(newlyReady);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      void refreshInbox();
    }, [refresh, refreshInbox]),
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
            <View style={styles.headerRow}>
            <HeaderInboxLink
              label="People"
              count={newlyReady.length}
              accessibilityLabel={PrettyCopy.peopleTitle}
              onPress={() => {
                router.push('/people');
              }}
            />
            <HeaderInboxLink
              label="Requests"
              count={pendingRequests}
              accessibilityLabel={PrettyCopy.requestsTitle}
              onPress={() => {
                router.push('/requests');
              }}
            />
            <Pressable
              onPress={() => {
                track('settings_opened', { source: 'wishlist_header' });
                router.push('/settings');
              }}
              hitSlop={12}
              style={styles.headerBtn}>
              <ThemedText type="smallBold" themeColor="brand">
                Settings
              </ThemedText>
            </Pressable>
            </View>
          ),
        }}
      />
      <FlowHeader
        role="owner"
        title="What you actually want"
        subtitle={`Photo-first list for ${user?.email ?? 'you'}. Friends pick from a share link — you won’t see reserves, pledges, or who bought what. Group gifts stay unspoiled until the reveal date.`}
      />

      <View style={styles.actions}>
        <Button label="Add a gift" icon="gift" onPress={() => router.push('/add')} />
        <Button label="Paste Instagram URL" variant="secondary" onPress={() => router.push('/paste')} />
        <Button
          label="Share / occasions"
          icon="share"
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

      {requestCopy ? (
        <InboxBanner
          title="Someone’s waiting"
          body={requestCopy}
          actionLabel={PrettyCopy.requestsBannerCta}
          onAction={() => router.push('/requests')}
          accessibilityLabel="pending-giver-requests"
        />
      ) : null}
      {readyCopy ? (
        <InboxBanner
          title="They’re ready"
          body={readyCopy}
          actionLabel={PrettyCopy.peopleTitle}
          onAction={() => router.push('/people')}
          accessibilityLabel="accepted-giver-pins"
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
          emptyTitle={PrettyCopy.ownerEmptyTitle}
          emptyBody={PrettyCopy.ownerEmptyBody}
          emptyActionLabel={PrettyCopy.ownerEmptyCta}
          onEmptyAction={() => router.push('/add')}
          emptySecondaryLabel={PrettyCopy.ownerEmptySecondary}
          onEmptySecondary={() => router.push('/paste')}
          emptyKind="owner"
        />
      ) : null}

      <LegalLinks includeSettings />
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: Spacing.twoHalf,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
});
