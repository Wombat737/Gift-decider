import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { DeadLinkBanner } from '@/components/dead-link-banner';
import { FlairIcon } from '@/components/flair-icons';
import { HeaderInboxLink } from '@/components/inbox-badge';
import { ItemGrid, ItemGridSkeleton } from '@/components/item-grid';
import { LegalLinks } from '@/components/legal-links';
import { ReadyToBuyBanner } from '@/components/ready-to-buy-banner';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useGiverShare } from '@/context/giver-share-context';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PrettyCopy, mateNudgeMessage } from '@/lib/copy';
import { giverListTitle } from '@/lib/list-title';
import { demoOwnerHasTasteTags } from '@/lib/demo-social';
import { isDemoShareToken } from '@/lib/demo-store';
import { giverListPaint, giverPaintItems, peekGiverCatalog, useGiverCatalogState } from '@/lib/giver-catalog';
import { groupGiftPhase } from '@/lib/pledges';
import { ownerTasteTagsHint, searchSharedWishlistItems } from '@/services/giver-social';

export default function GiverShareScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { newlyReady, refreshInbox } = useInbox();
  const { token, meta, error, loading, fetchSettled, refresh, items: shareItems } = useGiverShare();
  const { items: catalogItems, hydrated } = useGiverCatalogState(token);
  const items = giverPaintItems(catalogItems, shareItems);
  const [focusGen, setFocusGen] = useState(0);
  const [query, setQuery] = useState('');
  const [hitIds, setHitIds] = useState<string[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  function goAddSomeone() {
    router.push(user ? '/people?add=1' : '/sign-in');
  }

  function goPeople() {
    router.push(user ? '/people' : '/sign-in');
  }

  useFocusEffect(
    useCallback(() => {
      setFocusGen((count) => count + 1);
      // Paint the catalog snapshot (Bought) before a silent refetch that may still
      // carry the previous Taken row. First open / empty catalog is never silent —
      // that used to skip the loading skeleton and stick on the giver empty hero.
      const frame = requestAnimationFrame(() => {
        const silent = Boolean(token && peekGiverCatalog(token).length > 0);
        void refresh({ silent });
        void refreshInbox();
      });
      return () => cancelAnimationFrame(frame);
    }, [refresh, refreshInbox, token]),
  );

  const listTitle = giverListTitle(meta, {
    loading: loading || !fetchSettled,
    unmatched: Boolean(error) && !meta && fetchSettled,
  });
  const occasion = meta?.occasion_title;
  const readyToBuy = items.filter((item) => groupGiftPhase(item) === 'ready_to_buy');
  const visible = useMemo(() => {
    if (!hitIds) return items;
    const order = new Map(hitIds.map((id, index) => [id, index]));
    return items.filter((item) => order.has(item.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [hitIds, items]);

  const emptyHint =
    query.trim() && token && isDemoShareToken(token) ? ownerTasteTagsHint(demoOwnerHasTasteTags()) : null;
  const paint = giverListPaint({
    token,
    loading,
    fetchSettled,
    settledToken: fetchSettled ? token : undefined,
    hydrated,
    itemCount: visible.length,
    query,
    error,
  });

  async function remindThem() {
    const text = mateNudgeMessage();
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return;
    }
    await Share.share({ message: text });
  }

  async function onSearch(nextQuery: string) {
    setQuery(nextQuery);
    const q = nextQuery.trim();
    if (!q || !token) {
      setHitIds(null);
      setSearchError(null);
      return;
    }
    try {
      const hits = await searchSharedWishlistItems(token, q);
      setHitIds(hits.map((hit) => hit.id));
      setSearchError(null);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setHitIds([]);
    }
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: listTitle,
          headerRight: () => (
            <View style={styles.headerRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={PrettyCopy.peopleCta}
                hitSlop={12}
                onPress={goAddSomeone}
                style={[styles.headerAdd, { backgroundColor: theme.brand }]}>
                <FlairIcon name="add" color={theme.brandText} />
              </Pressable>
              <HeaderInboxLink
                label="People"
                count={user ? newlyReady.length : 0}
                accessibilityLabel={PrettyCopy.peopleTitle}
                onPress={goPeople}
              />
            </View>
          ),
        }}
      />
      {occasion ? (
        <ThemedText type="small" themeColor="textSecondary">
          {occasion}
        </ThemedText>
      ) : null}

      <TextField
        label="Search gifts"
        value={query}
        onChangeText={(value) => void onSearch(value)}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="linen, mug, trail…"
      />
      {emptyHint && query.trim() && visible.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {emptyHint}
        </ThemedText>
      ) : null}
      {searchError ? (
        <ThemedText type="small" themeColor="accent">
          {searchError}
        </ThemedText>
      ) : null}

      {error ? (
        <>
          <ThemedText type="small" themeColor="accent">
            {error}
          </ThemedText>
          <Button label="Try again" variant="secondary" onPress={() => void refresh()} />
        </>
      ) : null}

      {readyToBuy.length > 0 ? <ReadyToBuyBanner items={readyToBuy} /> : null}
      <DeadLinkBanner items={items} />

      {paint === 'skeleton' ? (
        <ItemGridSkeleton />
      ) : (
        <ItemGrid
          key={`${token ?? 'share'}:${focusGen}:${query}`}
          items={visible}
          showStatus
          hrefFor={(item) => `/g/${token}/${item.id}`}
          emptyTitle={query.trim() ? 'Nothing matched' : PrettyCopy.giverEmptyTitle}
          emptyBody={query.trim() ? 'Try another word — titles and notes, not a tag cloud.' : PrettyCopy.giverEmptyBody}
          emptyActionLabel={query.trim() ? undefined : PrettyCopy.giverEmptyCta}
          onEmptyAction={query.trim() ? undefined : () => void remindThem()}
          emptySecondaryLabel={query.trim() ? undefined : PrettyCopy.peopleCta}
          onEmptySecondary={query.trim() ? undefined : goAddSomeone}
          emptyKind="giver"
        />
      )}

      <LegalLinks />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  headerBtn: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  headerAdd: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
