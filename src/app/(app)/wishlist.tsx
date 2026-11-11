import { router, Stack, useFocusEffect, useLocalSearchParams, usePathname } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Platform, ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import {
  AvatarStack,
  CircleButton,
  EditionStory,
  INK,
  IssueEntry,
  MUTED,
  PickEntry,
  SectionRule,
  screenPad,
} from '@/components/edition-layout';
import { HeadlineChooser } from '@/components/headline-chooser';
import { GivenNamePrompt } from '@/components/given-name-prompt';
import { MonogramMark } from '@/components/meantvo-mark';
import { NativePressable } from '@/components/native-pressable';
import { PeelArt } from '@/components/peel-moment';
import { PersonAvatar } from '@/components/person-avatar';
import { SamplePick } from '@/components/sample-pick';
import { Screen } from '@/components/screen';
import { EditionIconTabs } from '@/components/stage-tab-bar';
import { StageStickyHeader } from '@/components/stage-sticky-header';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useOwnerLists } from '@/hooks/use-owner-lists';
import { track } from '@/lib/analytics';
import { usesDemoData } from '@/lib/app-mode';
import { nextCoverOverride, type CoverOverride } from '@/lib/cover';
import { PrettyCopy } from '@/lib/copy';
import { demoEventOn, readEdition, writeEdition, type EditionMeta } from '@/lib/edition';
import { formatAudQuiet } from '@/lib/format';
import { displayHeadline, issueDateline, issueKicker, listMetaLine } from '@/lib/headlines';
import { listAsPlainText } from '@/lib/list-text';
import { clearPickPulse, peekPickPulse } from '@/lib/pick-pulse';
import { readAppPrefs, writeAppPrefs } from '@/lib/preferences';
import { PICK_PULSE_MS } from '@/lib/stage-home';
import { getOwnProfile } from '@/services/profile';
import { listInvites } from '@/services/wishlist';

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

function pad(index: number) {
  return String(index).padStart(2, '0');
}

export default function OwnerHomeScreen() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const params = useLocalSearchParams<{ fresh?: string | string[]; find?: string | string[] }>();
  const { user } = useAuth();
  const { items, occasions, list, loading, error, refresh } = useOwnerLists();
  const [pulseId, setPulseId] = useState<string | null>(null);
  const announcedPulse = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const listTop = useRef(0);
  const pulseY = useRef<number | null>(null);
  const scrolledPulse = useRef('');
  const fresh = oneParam(params.fresh).trim();
  const find = oneParam(params.find) === '1';
  const today = useMemo(() => new Date(), []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [editions, setEditions] = useState<Record<string, EditionMeta>>({});
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [sharedNames, setSharedNames] = useState<string[]>([]);
  const [sampleOn, setSampleOn] = useState(() => !readAppPrefs().sampleDismissed);

  useFocusEffect(
    useCallback(() => {
      const nextPulse = peekPickPulse() || fresh || null;
      if (nextPulse) setPulseId(nextPulse);
      void refresh();
      void getOwnProfile()
        .then((profile) => {
          setAvatarUrl(profile?.avatar_url ?? null);
          setOwnerName(profile?.display_name ?? null);
        })
        .catch(() => {
          setAvatarUrl(null);
        });
      if (usesDemoData()) {
        setSharedNames(['Mum', 'Priya', 'Alex']);
        return;
      }
      void listInvites()
        .then((rows) => {
          setSharedNames(
            rows
              .filter((row) => row.accepted_at)
              .map((row) => (row.email ?? '').split('@')[0])
              .filter(Boolean),
          );
        })
        .catch(() => setSharedNames([]));
    }, [fresh, refresh]),
  );

  const rowReady = Boolean(pulseId && items.some((item) => item.id === pulseId));

  useEffect(() => {
    if (!pulseId || !rowReady) return;
    const found = items.find((item) => item.id === pulseId);
    if (found?.occasion_id) setOpenId(found.occasion_id);
    if (announcedPulse.current !== pulseId) {
      announcedPulse.current = pulseId;
      AccessibilityInfo.announceForAccessibility(PrettyCopy.pickAdded);
    }
    const timer = setTimeout(() => {
      clearPickPulse(pulseId);
      setPulseId((current) => (current === pulseId ? null : current));
    }, PICK_PULSE_MS + 80);
    return () => clearTimeout(timer);
  }, [items, pulseId, rowReady]);

  function scrollPulse(yInList = pulseY.current) {
    if (!pulseId || yInList == null) return;
    pulseY.current = yInList;
    const target = Math.max(0, listTop.current + yInList - 16);
    const key = `${pulseId}:${Math.round(target)}`;
    if (scrolledPulse.current === key) return;
    scrolledPulse.current = key;
    scrollRef.current?.scrollTo({ y: target, animated: true });
  }

  const lists = useMemo(
    () =>
      occasions.map((occasion) => ({
        id: occasion.id,
        title: occasion.title,
        createdAt: occasion.created_at,
      })),
    [occasions],
  );

  const ordered = useMemo(() => {
    return [...lists].sort((a, b) => {
      const ad = editionFor(a.id, today).eventOn;
      const bd = editionFor(b.id, today).eventOn;
      if (ad && bd) return ad.localeCompare(bd);
      if (ad) return -1;
      if (bd) return 1;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [lists, today, editions]);

  const active = ordered.find((row) => row.id === openId) ?? ordered[0] ?? null;
  const edition = active ? (editions[active.id] ?? editionFor(active.id, today)) : null;
  const picksFor = (id: string) => items.filter((item) => item.occasion_id === id);
  const picks = active ? picksFor(active.id) : items;
  const who = ownerName || 'You';

  function remember(id: string, patch: Partial<EditionMeta>) {
    const next = writeEdition(id, patch);
    setEditions((current) => ({ ...current, [id]: next }));
  }

  function photoFor(id: string, meta: EditionMeta) {
    return meta.coverImageUrl || picksFor(id).find((item) => item.image_url)?.image_url || null;
  }

  async function copyText(name: string) {
    const text = listAsPlainText(
      name,
      picks.map((item) => ({
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

  const showingList = Boolean(openId && active && edition);
  const feature = ordered[0];
  const featureEdition = feature ? editions[feature.id] ?? editionFor(feature.id, today) : null;

  return (
    <Screen scrollRef={scrollRef} padded={false} sticky={null} style={screenPad()}>
      <Stack.Screen options={{ headerShown: false, title: PrettyCopy.ownerHomeTitle }} />
      {false ? <StageStickyHeader title={PrettyCopy.ownerHomeTitle} /> : null}
      <View style={{ paddingTop: insets.top }}>
        {showingList && active && edition ? (
          <View style={styles.listBar}>
            <CircleButton label="All lists" onPress={() => { setOpenId(null); setMore(false); }}>
              <ThemedText style={styles.chevron}>‹</ThemedText>
            </CircleButton>
            <ThemedText style={styles.listTitle}>Your list</ThemedText>
            <CircleButton label="More" onPress={() => setMore((value) => !value)}>
              <ThemedText style={styles.chevron}>···</ThemedText>
            </CircleButton>
          </View>
        ) : (
          <>
            <View style={styles.mast}>
              <PersonAvatar name={who} uri={avatarUrl} size={38} />
              <View style={styles.mastCopy}>
                <ThemedText accessibilityRole="header" style={styles.mastTitle}>
                  {PrettyCopy.ownerHomeTitle}
                </ThemedText>
                <ThemedText style={styles.dateline}>{issueDateline(today, Math.max(ordered.length, 1))}</ThemedText>
              </View>
              <MonogramMark size={34} />
            </View>
            <EditionIconTabs pathname={pathname} find={find} />
          </>
        )}
      </View>

      <View style={styles.prompt}>
        <GivenNamePrompt />
      </View>

      {error ? (
        <ThemedText type="small" themeColor="accent" style={styles.pad}>
          {error}
        </ThemedText>
      ) : null}

      {showingList && active && edition ? (
        <View
          onLayout={(event) => {
            listTop.current = event.nativeEvent.layout.y;
            scrollPulse();
          }}>
          <EditionStory
            kicker={issueKicker(active.title, edition.headline, edition.eventOn, today)}
            headline={displayHeadline(edition.headline, active.title, who)}
            meta={listMetaLine(active.title, edition.eventOn, picks.length)}
            imageUrl={photoFor(active.id, edition)}
            title={active.title}
            eventOn={edition.eventOn}
            override={edition.coverOverride}
            names={sharedNames}
            onChangeCover={() => remember(active.id, { coverOverride: nextCoverOverride(edition.coverOverride as CoverOverride) })}
          />
          <View style={styles.shareRow}>
            <ThemedText style={styles.shared}>Shared with {sharedNames.length}</ThemedText>
            <NativePressable
              accessibilityRole="button"
              accessibilityLabel={PrettyCopy.ownerShareLink}
              onPress={() => {
                track('share_screen_opened');
                router.push('/share');
              }}
              style={styles.shareBtn}>
              <ThemedText style={styles.shareBtnText}>Share link</ThemedText>
            </NativePressable>
          </View>
          {more ? (
            <View style={styles.more}>
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
              <NativePressable accessibilityRole="button" accessibilityLabel={PrettyCopy.copyAsText} onPress={() => void copyText(active.title)} style={styles.copyHit}>
                <ThemedText type="bodyEm">{PrettyCopy.copyAsText}</ThemedText>
              </NativePressable>
            </View>
          ) : null}
          <View style={styles.picksHead}>
            <SectionRule label={`YOUR PICKS · ${picks.length}`} />
          </View>
          {picks.map((item, index) => (
            <View
              key={item.id}
              onLayout={
                item.id === pulseId
                  ? (event) => scrollPulse(event.nativeEvent.layout.y)
                  : undefined
              }>
              <PickEntry
                number={pad(index + 1)}
                kind={item.item_kind}
                title={item.title || 'Untitled gift'}
                price={
                  item.target_amount
                    ? `${item.item_kind === 'vibe' ? 'Around ' : ''}${formatAudQuiet(item.target_amount)}`
                    : null
                }
                note={item.notes}
                imageUrl={item.image_url}
                onPress={() => router.push(`/item/${item.id}`)}
              />
            </View>
          ))}
          {picks.length === 0 && sampleOn ? (
            <View style={styles.pad}>
              <SamplePick
                onDismiss={() => {
                  writeAppPrefs({ sampleDismissed: true });
                  setSampleOn(false);
                }}
              />
            </View>
          ) : null}
        </View>
      ) : feature && featureEdition ? (
        <View style={{ marginTop: 12 }}>
          <EditionStory
            kicker={issueKicker(feature.title, featureEdition.headline, featureEdition.eventOn, today)}
            headline={displayHeadline(featureEdition.headline, feature.title, who)}
            meta={listMetaLine(feature.title, featureEdition.eventOn, picksFor(feature.id).length)}
            imageUrl={photoFor(feature.id, featureEdition)}
            title={feature.title}
            eventOn={featureEdition.eventOn}
            override={featureEdition.coverOverride}
            names={sharedNames}
            onPress={() => setOpenId(feature.id)}
          />
          {ordered.length > 1 ? (
            <View style={{ marginTop: 16 }}>
              <SectionRule label={PrettyCopy.ownerSection} />
              {ordered.slice(1).map((row, index) => {
                const meta = editions[row.id] ?? editionFor(row.id, today);
                return (
                  <IssueEntry
                    key={row.id}
                    number={pad(index + 2)}
                    headline={displayHeadline(meta.headline, row.title, who)}
                    meta={listMetaLine(row.title, meta.eventOn, picksFor(row.id).length).replace(/ · \d+ picks$/, '')}
                    imageUrl={photoFor(row.id, meta)}
                    title={row.title}
                    eventOn={meta.eventOn}
                    override={meta.coverOverride}
                    names={sharedNames.slice(0, 2)}
                    onPress={() => setOpenId(row.id)}
                  />
                );
              })}
            </View>
          ) : null}
        </View>
      ) : !loading ? (
        <View style={styles.empty}>
          <View pointerEvents="none" style={styles.art}>
            <PeelArt />
          </View>
          <ThemedText type="title">{PrettyCopy.ownerEmptyTitle}</ThemedText>
          <ThemedText themeColor="textSecondary">{PrettyCopy.ownerEmptyBody}</ThemedText>
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
            style={styles.copyHit}>
            <ThemedText type="bodyEm">{PrettyCopy.ownerEmptyCta}</ThemedText>
          </NativePressable>
        </View>
      ) : (
        <ThemedText themeColor="textSecondary" style={styles.pad}>
          Loading…
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  mast: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  mastCopy: {
    flex: 1,
    alignItems: 'center',
  },
  mastTitle: {
    fontFamily: FontFamilies.serif,
    fontSize: 27,
    lineHeight: 27,
    color: INK,
  },
  dateline: {
    marginTop: 4,
    fontFamily: FontFamilies.sansSemibold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.6,
    color: MUTED,
  },
  listBar: {
    height: 54,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listTitle: {
    fontFamily: FontFamilies.sansSemibold,
    fontSize: 14,
    lineHeight: 18,
    color: MUTED,
  },
  chevron: {
    fontSize: 22,
    lineHeight: 24,
    color: INK,
  },
  prompt: {
    paddingHorizontal: 20,
  },
  pad: {
    paddingHorizontal: 20,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  shared: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: 12.5,
    lineHeight: 16,
    color: MUTED,
  },
  shareBtn: {
    height: 36,
    minHeight: 44,
    paddingHorizontal: 14,
    backgroundColor: INK,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontFamily: FontFamilies.sansSemibold,
    fontSize: 13,
    lineHeight: 16,
  },
  more: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  copyHit: {
    minHeight: 44,
    justifyContent: 'center',
  },
  picksHead: {
    paddingTop: 14,
  },
  empty: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: Spacing.twoHalf,
  },
  art: {
    alignSelf: 'center',
  },
});
