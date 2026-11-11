import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';

import { DateField } from '@/components/date-field';
import { HeadlineChooser } from '@/components/headline-chooser';
import { IssueCover } from '@/components/issue-cover';
import { GivenNamePrompt } from '@/components/given-name-prompt';
import { NativePressable } from '@/components/native-pressable';
import { PeelArt } from '@/components/peel-moment';
import { PersonAvatar } from '@/components/person-avatar';
import { SamplePick } from '@/components/sample-pick';
import { Screen } from '@/components/screen';
import { StagePickRow } from '@/components/stage-pick-row';
import { StageStickyHeader } from '@/components/stage-sticky-header';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { useOwnerLists } from '@/hooks/use-owner-lists';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { nextCoverOverride, type CoverOverride } from '@/lib/cover';
import { PrettyCopy } from '@/lib/copy';
import { demoEventOn, readEdition, writeEdition, type EditionMeta } from '@/lib/edition';
import { issueDateline, issueKicker, orderedIssues } from '@/lib/headlines';
import { listAsPlainText } from '@/lib/list-text';
import { clearPickPulse, peekPickPulse } from '@/lib/pick-pulse';
import { readAppPrefs, writeAppPrefs } from '@/lib/preferences';
import { PICK_PULSE_MS } from '@/lib/stage-home';
import { getOwnProfile } from '@/services/profile';

function oneParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function editionFor(id: string, today: Date): EditionMeta {
  const stored = readEdition(id);
  if (stored.eventOn) return stored;
  const demo = demoEventOn(id, today);
  return demo ? { ...stored, eventOn: demo } : stored;
}

export default function OwnerHomeScreen() {
  const params = useLocalSearchParams<{ fresh?: string | string[] }>();
  const { user } = useAuth();
  const { items, occasions, list, loading, error, refresh } = useOwnerLists();
  const [pulseId, setPulseId] = useState<string | null>(null);
  const announcedPulse = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const listTop = useRef(0);
  const pulseY = useRef<number | null>(null);
  const scrolledPulse = useRef('');
  const fresh = oneParam(params.fresh).trim();
  const today = useMemo(() => new Date(), []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editions, setEditions] = useState<Record<string, EditionMeta>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [sampleOn, setSampleOn] = useState(() => !readAppPrefs().sampleDismissed);

  useFocusEffect(
    useCallback(() => {
      const nextPulse = peekPickPulse() || fresh || null;
      if (nextPulse) setPulseId(nextPulse);
      void refresh();
      void getOwnProfile()
        .then((profile) => setAvatarUrl(profile?.avatar_url ?? null))
        .catch(() => setAvatarUrl(null));
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

  const lists = useMemo(
    () =>
      orderedIssues(
        occasions.map((occasion) => ({
          id: occasion.id,
          title: occasion.title,
          shareToken: occasion.share_token,
          createdAt: occasion.created_at,
        })),
        (id) => (editions[id] ?? editionFor(id, today)).eventOn,
        today,
      ),
    [occasions, today, editions],
  );

  const wholeId = list?.id ?? 'home';
  const activeId = openId ?? (lists[0]?.id ?? wholeId);
  const active = lists.find((list) => list.id === activeId) ?? {
    id: wholeId,
    title: list?.title || PrettyCopy.ownerHomeTitle,
    shareToken: list?.share_token ?? '',
    createdAt: '',
  };
  const edition = editions[active.id] ?? editionFor(active.id, today);
  const picksFor = (id: string) =>
    occasions.some((occasion) => occasion.id === id)
      ? items.filter((item) => item.occasion_id === id)
      : items;
  const picks = picksFor(active.id);
  const coverPhoto =
    edition.coverImageUrl || picks.find((item) => item.image_url)?.image_url || null;

  function remember(id: string, patch: Partial<EditionMeta>) {
    const next = writeEdition(id, patch);
    setEditions((current) => ({ ...current, [id]: next }));
  }

  async function copyText(name: string, rows: typeof items) {
    const text = listAsPlainText(
      name,
      rows.map((item) => ({
        title: item.title,
        target_amount: item.target_amount,
        buy_url: item.buy_url,
      })),
    );
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return;
    }
    await Share.share({ message: text });
  }

  const showingIndex = openId == null && lists.length > 0;
  const feature = lists[0];
  const rest = lists.slice(1);

  return (
    <Screen
      scrollRef={scrollRef}
      sticky={
        <View>
          <StageStickyHeader title={PrettyCopy.ownerHomeTitle} links={false} />
          <View style={styles.mast}>
            <PersonAvatar name={user?.email} uri={avatarUrl} size={40} />
            <ThemedText type="small" themeColor="textSecondary">
              {issueDateline(today)}
            </ThemedText>
          </View>
        </View>
      }>
      <Stack.Screen options={{ headerShown: false, title: PrettyCopy.ownerHomeTitle }} />
      <GivenNamePrompt />

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}
      {loading && items.length === 0 ? <ThemedText themeColor="textSecondary">Loading…</ThemedText> : null}

      {showingIndex && feature ? (
        <View style={styles.list}>
          <IssueCover
            title={feature.title}
            headline={editionFor(feature.id, today).headline}
            kicker={issueKicker(feature.title, editionFor(feature.id, today).headline, editionFor(feature.id, today).eventOn, today)}
            imageUrl={
              (editions[feature.id] ?? editionFor(feature.id, today)).coverImageUrl ||
              picksFor(feature.id).find((item) => item.image_url)?.image_url
            }
            override={(editions[feature.id] ?? editionFor(feature.id, today)).coverOverride}
            onPress={() => setOpenId(feature.id)}
          />
          {rest.length > 0 ? (
            <View style={styles.list}>
              <ThemedText type="eyebrow" themeColor="textSecondary">
                {PrettyCopy.ownerSection}
              </ThemedText>
              {rest.map((list, index) => {
                const meta = editions[list.id] ?? editionFor(list.id, today);
                return (
                  <NativePressable
                    key={list.id}
                    accessibilityRole="button"
                    accessibilityLabel={list.title}
                    onPress={() => setOpenId(list.id)}
                    style={styles.entry}>
                    <ThemedText type="eyebrow" themeColor="textSecondary">
                      {String(index + 2).padStart(2, '0')}
                    </ThemedText>
                    <View style={styles.entryCopy}>
                      <ThemedText type="titleSm">{meta.headline?.replace(/\*/g, '') || list.title}</ThemedText>
                      {meta.headline ? (
                        <ThemedText type="small" themeColor="textSecondary">
                          {list.title}
                        </ThemedText>
                      ) : null}
                    </View>
                  </NativePressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ) : (
        <View
          style={styles.list}
          onLayout={(event) => {
            listTop.current = event.nativeEvent.layout.y;
            scrollPulse();
          }}>
          {openId ? (
            <NativePressable accessibilityRole="button" accessibilityLabel="All lists" onPress={() => setOpenId(null)} style={styles.shareLink}>
              <ThemedText type="bodyEm" themeColor="textSecondary">
                All lists
              </ThemedText>
            </NativePressable>
          ) : null}
          <IssueCover
            title={active.title}
            headline={edition.headline}
            kicker={issueKicker(active.title, edition.headline, edition.eventOn, today)}
            imageUrl={coverPhoto}
            override={edition.coverOverride}
            onChangeCover={() =>
              remember(active.id, { coverOverride: nextCoverOverride(edition.coverOverride as CoverOverride) })
            }
          />
          <DateField
            label="Date"
            value={edition.eventOn ?? ''}
            onChange={(eventOn) => remember(active.id, { eventOn: eventOn || null })}
          />
          <HeadlineChooser
            listName={active.title}
            value={edition.headline}
            onChange={(headline) => remember(active.id, { headline })}
          />
          {picks.length > 0 ? (
            picks.map((item) => (
              <StagePickRow
                key={item.id}
                item={item}
                href={`/item/${item.id}`}
                pulse={item.id === pulseId}
                onPulseLayout={item.id === pulseId ? scrollPulse : undefined}
              />
            ))
          ) : sampleOn ? (
            <SamplePick
              onDismiss={() => {
                writeAppPrefs({ sampleDismissed: true });
                setSampleOn(false);
              }}
            />
          ) : null}
        </View>
      )}

      {!loading && !error && items.length === 0 && lists.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.art} pointerEvents="none">
            <PeelArt />
          </View>
          <ThemedText type="title" style={styles.emptyTitle}>
            {PrettyCopy.ownerEmptyTitle}
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.emptyBody}>
            {PrettyCopy.ownerEmptyBody}
          </ThemedText>
          {sampleOn ? (
            <SamplePick
              onDismiss={() => {
                writeAppPrefs({ sampleDismissed: true });
                setSampleOn(false);
              }}
            />
          ) : null}
          <NativePressable
            accessibilityRole="button"
            accessibilityLabel={PrettyCopy.ownerEmptyCta}
            onPress={() => router.push('/add')}
            style={styles.shareLink}>
            <ThemedText type="bodyEm">{PrettyCopy.ownerEmptyCta}</ThemedText>
          </NativePressable>
        </View>
      ) : null}

      <View style={styles.actions}>
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
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel={PrettyCopy.copyAsText}
          onPress={() => void copyText(active.title, picks)}
          style={styles.shareLink}>
          <ThemedText type="bodyEm">{PrettyCopy.copyAsText}</ThemedText>
        </NativePressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  mast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
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
  entry: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  entryCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  empty: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    alignItems: 'flex-start',
  },
  art: {
    alignSelf: 'center',
  },
  emptyTitle: {
    letterSpacing: -0.4,
  },
  emptyBody: {
    maxWidth: 320,
  },
});
