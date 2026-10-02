import { router, Stack, useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/button';
import { FlairIcon } from '@/components/flair-icons';
import { HeaderInboxLink } from '@/components/inbox-badge';
import { InboxBanner } from '@/components/inbox-banner';
import { ItemGrid } from '@/components/item-grid';
import { LegalLinks } from '@/components/legal-links';
import { QuietSelect } from '@/components/quiet-select';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useInbox } from '@/context/inbox-context';
import { useWishlist } from '@/context/wishlist-context';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { PrettyCopy } from '@/lib/copy';
import { acceptBannerText, requestBannerText } from '@/lib/inbox';
import { shouldShowOccasionFilter } from '@/lib/occasions';

export default function WishlistGridScreen() {
  const theme = useTheme();
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

  useEffect(() => {
    if (!shouldShowOccasionFilter(occasions.length)) {
      if (occasionId !== 'all') setOccasionId('all');
      return;
    }
    if (occasionId !== 'all' && occasionId !== 'none' && !occasions.some((row) => row.id === occasionId)) {
      setOccasionId('all');
    }
  }, [occasionId, occasions]);

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View style={styles.headerRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share"
              onPress={() => {
                track('share_screen_opened');
                router.push('/share');
              }}
              hitSlop={12}
              style={styles.headerIcon}>
              <FlairIcon name="share" color={theme.brand} size={22} />
            </Pressable>
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
              <ThemedText type="smallBold">
                Settings
              </ThemedText>
            </Pressable>
            </View>
          ),
        }}
      />
      {!loading && visible.length > 0 ? (
        <View style={styles.actions}>
          <Button label={PrettyCopy.ownerEmptyCta} icon="gift" onPress={() => router.push('/add')} />
        </View>
      ) : null}

      {shouldShowOccasionFilter(occasions.length) ? (
        <QuietSelect
          label="Occasion"
          value={occasionId}
          onChange={setOccasionId}
          options={[
            { id: 'all', label: 'All gifts' },
            ...occasions.map((row) => ({ id: row.id, label: row.title })),
            { id: 'none', label: 'Unassigned' },
          ]}
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
  headerIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
