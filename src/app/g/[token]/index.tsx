import { router, Stack, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { PeelMoment } from '@/components/peel-moment';
import { DeadLinkBanner } from '@/components/dead-link-banner';
import { FlairIcon } from '@/components/flair-icons';
import { HeaderInboxLink } from '@/components/inbox-badge';
import { ItemGridSkeleton } from '@/components/item-grid';
import { LegalLinks } from '@/components/legal-links';
import { ReadyToBuyBanner } from '@/components/ready-to-buy-banner';
import { Screen } from '@/components/screen';
import { StageStickyHeader } from '@/components/stage-sticky-header';
import { GiverListControls } from '@/components/giver-list-controls';
import { HeadlineText } from '@/components/headline-text';
import {
  CoverArt,
  EditionStory,
  INK,
  IssueEntry,
  KickerTag,
  MUTED,
  OXBLOOD,
  SectionRule,
} from '@/components/edition-layout';
import { EditionDock } from '@/components/stage-tab-bar';
import { PersonAvatar } from '@/components/person-avatar';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useGiverShare } from '@/context/giver-share-context';
import { FontFamilies, Radius, Spacing } from '@/constants/theme';
import { useOwnerPreview } from '@/hooks/use-owner-preview';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { PrettyCopy, cantSeeLine, mateNudgeMessage } from '@/lib/copy';
import { giverListTitle, personFirstLabel, recipientPicksTitle } from '@/lib/list-title';
import { demoOwnerHasTasteTags } from '@/lib/demo-social';
import { isDemoShareToken } from '@/lib/demo-store';
import { giverListPaint, giverPaintItems, patchGiverCatalog, peekGiverCatalog, useGiverCatalogState } from '@/lib/giver-catalog';
import { presentGiverList, giverListControlsVisible, giverPriceLabel, groupGiftCardProgress, type GiverListSort } from '@/lib/giver-list';
import { applyItemStatus, rememberedGiverName, rememberGiverName } from '@/lib/giver-status';
import { hapticLight } from '@/lib/haptics';
import { ownerPreviewItem } from '@/lib/owner-preview';
import { groupGiftPhase } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';
import { listItemGiverComments, ownerTasteTagsHint, searchSharedWishlistItems } from '@/services/giver-social';
import { setSharedItemStatus } from '@/services/wishlist';

export default function GiverShareScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const { newlyReady, refreshInbox } = useInbox();
  const { token, meta, error, loading, fetchSettled, refresh, items: shareItems, patchItem } = useGiverShare();
  const ownerPreview = useOwnerPreview(token);
  const { items: catalogItems, hydrated } = useGiverCatalogState(token);
  const painted = giverPaintItems(catalogItems, shareItems);
  const items = ownerPreview ? painted.map(ownerPreviewItem) : painted;
  const [focusGen, setFocusGen] = useState(0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<GiverListSort>('recommended');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [hitIds, setHitIds] = useState<string[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [peel, setPeel] = useState<{ id: string; key: number }>({ id: '', key: 0 });
  const [quote, setQuote] = useState<{ body: string; name: string } | null>(null);

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
  const picksTitle = meta ? recipientPicksTitle(meta.owner_display_name, meta.owner_handle) : listTitle;
  const readyToBuy = items.filter((item) => groupGiftPhase(item) === 'ready_to_buy');
  const searched = useMemo(() => {
    if (!hitIds) return items;
    const order = new Map(hitIds.map((id, index) => [id, index]));
    return items.filter((item) => order.has(item.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [hitIds, items]);
  const controlsOn = giverListControlsVisible(items.length);
  const visible = useMemo(
    () => presentGiverList(searched, { sort, availableOnly }, items.length),
    [availableOnly, items.length, searched, sort],
  );

  const emptyHint =
    query.trim() && token && isDemoShareToken(token) ? ownerTasteTagsHint(demoOwnerHasTasteTags()) : null;
  const paint = giverListPaint({
    token,
    loading,
    fetchSettled,
    settledToken: fetchSettled ? token : undefined,
    hydrated,
    itemCount: searched.length,
    query,
    error,
  });
  const searching = Boolean(query.trim());
  const feature = visible[0] ?? null;
  const rest = visible.slice(1);

  useEffect(() => {
    if (!feature || ownerPreview) return;
    let cancel = false;
    void listItemGiverComments(feature.id, { isOwnerRoute: false, loggedIn: Boolean(user) })
      .then((rows) => {
        if (cancel) return;
        const first = rows[0];
        setQuote(first ? { body: first.body, name: first.author_display_name } : null);
      })
      .catch(() => {
        if (!cancel) setQuote(null);
      });
    return () => {
      cancel = true;
    };
  }, [feature, ownerPreview, user]);

  async function claimFromList(item: WishlistItem) {
    if (ownerPreview || !token || item.status !== 'available' || claimingId) return;
    const known = rememberedGiverName();
    if (!known) {
      router.push(`/g/${token}/${item.id}?claim=1` as Href);
      return;
    }
    setClaimError(null);
    setClaimingId(item.id);
    setPeel((current) => ({ id: item.id, key: current.key + 1 }));
    const snapshot = item;
    const optimistic = applyItemStatus(item, 'reserved', known);
    patchItem(optimistic);
    patchGiverCatalog(token, optimistic);
    void hapticLight();
    try {
      const saved = await setSharedItemStatus(token, item.id, 'reserved', known);
      rememberGiverName(known);
      patchItem(saved);
      patchGiverCatalog(token, saved);
      track('giver_status', { status: 'reserved', source: 'list' });
    } catch (err) {
      patchItem(snapshot);
      patchGiverCatalog(token, snapshot);
      setClaimError(err instanceof Error ? err.message : 'Could not claim that gift');
    } finally {
      setClaimingId(null);
    }
  }

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

  const ownerFirst = personFirstLabel(meta?.owner_display_name, meta?.owner_handle) || 'They';
  const listHeadline = meta ? `${ownerFirst}'s *list*` : PrettyCopy.giverHeadline;

  return (
    <Screen padded={false} sticky={null} style={{ paddingBottom: 120 }}>
      <Stack.Screen
        options={{
          headerShown: false,
          title: picksTitle,
          gestureEnabled: false,
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={PrettyCopy.peopleCta} onPress={goAddSomeone} />
          ),
        }}
      />
      <View style={styles.listBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.circle}>
          <ThemedText style={styles.chevron}>‹</ThemedText>
        </Pressable>
        <ThemedText style={styles.barTitle}>{ownerPreview ? 'Preview' : `Giver view · ${ownerFirst}`}</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel={PrettyCopy.peopleCta} onPress={goAddSomeone} style={styles.circle}>
          <ThemedText style={styles.chevron}>···</ThemedText>
        </Pressable>
      </View>
      <View style={styles.hero}>
        <ThemedText style={styles.kickerLine}>
          {(meta ? `${picksTitle} · ${items.length} picks` : PrettyCopy.giverHeadline).toUpperCase()}
        </ThemedText>
        <HeadlineText text={listHeadline} style={styles.serifHeadline} />
        <ThemedText style={styles.cant}>
          {ownerPreview ? 'Gifts show as available. Reservations stay hidden.' : cantSeeLine(ownerFirst)}
        </ThemedText>
      </View>

      {paint === 'skeleton' ? (
        <ItemGridSkeleton />
      ) : paint === 'empty' ? (
        <View key={`${token ?? 'share'}:${focusGen}:${query}`} style={styles.empty}>
          <ThemedText type="title" style={styles.emptyTitle}>
            {searching ? 'Nothing matched' : PrettyCopy.giverEmptyTitle}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
            {searching ? 'Try another word — titles and notes, not a tag cloud.' : PrettyCopy.giverEmptyBody}
          </ThemedText>
          {!searching ? (
            <Button label={PrettyCopy.giverEmptyCta} icon="nudge" onPress={() => void remindThem()} />
          ) : null}
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.empty}>
          <ThemedText type="title" style={styles.emptyTitle}>
            Nothing available
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
            {searching
              ? 'Nothing in this search is still up for grabs.'
              : 'Reserved and bought gifts are hidden, including funded group gifts.'}
          </ThemedText>
          <Button label="Show all" variant="secondary" onPress={() => setAvailableOnly(false)} />
        </View>
      ) : (
        <View key={`${token ?? 'share'}:${focusGen}:${query}`}>
          {feature ? (
            <GiverFeature
              item={feature}
              index="01"
              readOnly={ownerPreview}
              quote={ownerPreview ? null : quote}
              busy={claimingId === feature.id}
              onOpen={() => {
                if (!token) return;
                router.push(
                  ownerPreview
                    ? ({ pathname: '/g/[token]/[itemId]', params: { token, itemId: feature.id, preview: '1' } } as Href)
                    : (`/g/${token}/${feature.id}` as Href),
                );
              }}
              onChoose={() => void claimFromList(feature)}
              peelKey={ownerPreview ? 0 : peel.id === feature.id ? peel.key : 0}
            />
          ) : null}
          {rest.length > 0 ? (
            <View style={{ paddingTop: 12 }}>
              <SectionRule label="ALSO ON THE LIST" />
              {rest.map((item, index) => (
                <GiverAlso
                  key={`${item.id}:${item.status}`}
                  item={item}
                  index={String(index + 2).padStart(2, '0')}
                  readOnly={ownerPreview}
                  onOpen={() => {
                    if (!token) return;
                    router.push(`/g/${token}/${item.id}` as Href);
                  }}
                  onShare={() => {
                    if (!token || ownerPreview) return;
                    router.push(`/g/${token}/${item.id}?chip=1` as Href);
                  }}
                />
              ))}
            </View>
          ) : null}
        </View>
      )}

      {false ? <StageStickyHeader title={picksTitle} /> : null}
      <View style={{ paddingHorizontal: 20, gap: 12, paddingTop: 16 }}>
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
        {claimError ? (
          <ThemedText type="small" themeColor="accent">
            {claimError}
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
        {!ownerPreview && readyToBuy.length > 0 ? <ReadyToBuyBanner items={readyToBuy} /> : null}
        {ownerPreview ? null : <DeadLinkBanner items={items} />}
        {controlsOn && paint !== 'skeleton' ? (
          <GiverListControls
            sort={sort}
            availableOnly={availableOnly}
            onSort={setSort}
            onAvailableOnly={setAvailableOnly}
          />
        ) : null}
      </View>
      <LegalLinks />
      <EditionDock />
    </Screen>
  );
}

function holderLine(item: { status: string; reserved_by: string | null }) {
  if (item.status !== 'reserved' && item.status !== 'purchased') return null;
  const raw = (item.reserved_by ?? '').trim();
  const name = raw && !/@/.test(raw) && raw.length < 32 ? raw : 'Someone';
  return `${name} has it`;
}

function GiverFeature({
  item,
  index,
  readOnly,
  quote,
  busy,
  onOpen,
  onChoose,
  peelKey = 0,
}: {
  item: import('@/lib/types').WishlistItem;
  index: string;
  readOnly: boolean;
  quote: { body: string; name: string } | null;
  busy: boolean;
  onOpen: () => void;
  onChoose: () => void;
  peelKey?: number;
}) {
  const price = giverPriceLabel(item);
  const taken = !readOnly && holderLine(item);
  return (
    <View>
      <Pressable accessibilityRole="button" onPress={onOpen}>
        <View style={{ height: 150, marginTop: 12 }}>
          <CoverArt uri={item.image_url} title={item.title || 'Pick'} frameHeight={150} />
          <View style={{ position: 'absolute', top: 10, left: 20, backgroundColor: '#FBF9F4', paddingHorizontal: 9, paddingVertical: 5 }}>
            <ThemedText style={{ fontFamily: FontFamilies.sansBold, fontSize: 10.5, letterSpacing: 1.4 }}>
              {item.item_kind === 'vibe' ? 'TASTE' : 'EXACT'}
            </ThemedText>
          </View>
          <ThemedText style={{ position: 'absolute', top: 8, right: 20, fontFamily: FontFamilies.serif, fontSize: 30, lineHeight: 32 }}>{index}</ThemedText>
        </View>
      </Pressable>
      <View style={{ paddingHorizontal: 20, paddingTop: 11, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontFamily: FontFamilies.serif, fontSize: 25, lineHeight: 26 }}>{item.title || 'Untitled gift'}</ThemedText>
          <ThemedText style={{ fontFamily: FontFamilies.sansMedium, fontSize: 12.5, color: MUTED, marginTop: 5 }}>
            {[price, quote ? '1 comment' : null].filter(Boolean).join(' · ')}
          </ThemedText>
        </View>
        {!readOnly && !taken && item.status === 'available' ? (
          <Pressable accessibilityRole="button" accessibilityLabel={PrettyCopy.claimCta} onPress={onChoose} style={{ height: 42, paddingHorizontal: 15, backgroundColor: OXBLOOD, alignItems: 'center', justifyContent: 'center' }}>
            <ThemedText style={{ color: '#fff', fontFamily: FontFamilies.sansSemibold, fontSize: 13.5 }}>{busy ? 'Saving…' : PrettyCopy.claimCta}</ThemedText>
          </Pressable>
        ) : null}
      </View>
      {!readOnly && peelKey > 0 ? <PeelMoment playKey={peelKey} size={68} /> : null}
      {!readOnly && quote ? (
        <View style={{ marginHorizontal: 20, marginTop: 11, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: OXBLOOD }}>
          <ThemedText style={{ fontFamily: FontFamilies.serifItalic, fontSize: 20, lineHeight: 22 }}>{`“${quote.body}”`}</ThemedText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 6 }}>
            <PersonAvatar name={quote.name} size={22} />
            <ThemedText style={{ fontFamily: FontFamilies.sansSemibold, fontSize: 12.5 }}>{quote.name}</ThemedText>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function GiverAlso({
  item,
  index,
  readOnly,
  onOpen,
  onShare,
}: {
  item: import('@/lib/types').WishlistItem;
  index: string;
  readOnly: boolean;
  onOpen: () => void;
  onShare: () => void;
}) {
  const progress = readOnly ? null : groupGiftCardProgress(item);
  const taken = readOnly ? null : holderLine(item);
  const price = giverPriceLabel(item);
  return (
    <View style={{ opacity: taken ? 0.6 : 1, flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#D9D2C4', minHeight: 44 }}>
      <Pressable accessibilityRole="button" onPress={onOpen} style={{ flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 44 }}>
      <ThemedText style={{ fontFamily: FontFamilies.serif, fontSize: 24, lineHeight: 26, color: OXBLOOD, width: 26 }}>{index}</ThemedText>
      <View style={{ width: 52, height: 52, overflow: 'hidden' }}>
        <CoverArt uri={item.image_url} title={item.title || 'Pick'} frameHeight={52} thumb />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <ThemedText style={{ fontFamily: FontFamilies.sansBold, fontSize: 10, letterSpacing: 1.4 }}>{item.item_kind === 'vibe' ? 'TASTE' : 'EXACT'}</ThemedText>
        <ThemedText numberOfLines={1} style={{ fontFamily: FontFamilies.serif, fontSize: 21, lineHeight: 23 }}>{item.title || 'Untitled gift'}</ThemedText>
        <ThemedText style={{ fontFamily: FontFamilies.sansMedium, fontSize: 12.5, color: MUTED, marginTop: 2 }}>{price}</ThemedText>
      </View>
      </Pressable>
      {progress ? (
        <View style={{ width: 118 }}>
          <View style={{ height: 4, backgroundColor: '#E4DCCC' }}>
            <View style={{ width: `${Math.round(progress.ratio * 100)}%`, height: '100%', backgroundColor: OXBLOOD }} />
          </View>
          <ThemedText style={{ fontFamily: FontFamilies.sansSemibold, fontSize: 12, marginTop: 6 }}>{progress.label}</ThemedText>
          {!readOnly ? (
            <Pressable accessibilityRole="button" accessibilityLabel={PrettyCopy.chipInCta} onPress={onShare} style={{ marginTop: 6, height: 28, borderWidth: 1, borderColor: INK, alignItems: 'center', justifyContent: 'center' }}>
              <ThemedText style={{ fontFamily: FontFamilies.sansSemibold, fontSize: 12.5 }}>{PrettyCopy.chipInCta}</ThemedText>
            </Pressable>
          ) : null}
        </View>
      ) : taken ? (
        <ThemedText style={{ fontFamily: FontFamilies.sansSemibold, fontSize: 12.5, color: MUTED }}>{taken}</ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  choosing: {
    minHeight: 32,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.twoHalf,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAdd: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  listBar: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#D9D2C4',
    backgroundColor: '#FBF9F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
  },
  barTitle: {
    fontFamily: FontFamilies.sansSemibold,
    fontSize: 14,
    color: MUTED,
  },
  kickerLine: {
    fontFamily: FontFamilies.sansBold,
    fontSize: 10.5,
    letterSpacing: 1.6,
    color: INK,
  },
  serifHeadline: {
    fontSize: 48,
    lineHeight: 46,
    letterSpacing: -0.8,
  },
  cant: {
    marginTop: 4,
    fontFamily: FontFamilies.sansMedium,
    fontSize: 13,
    lineHeight: 18,
  },
  stack: {
    gap: Spacing.three,
  },
  empty: {
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  emptyTitle: {
    letterSpacing: -0.4,
  },
  emptyBody: {
    maxWidth: 360,
  },
});
