import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Share } from 'react-native';

import { DeadLinkBanner } from '@/components/dead-link-banner';
import { FlowHeader } from '@/components/flow-header';
import { ItemGrid } from '@/components/item-grid';
import { LegalLinks } from '@/components/legal-links';
import { ReadyToBuyBanner } from '@/components/ready-to-buy-banner';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useGiverShare } from '@/context/giver-share-context';
import { PrettyCopy, mateNudgeMessage } from '@/lib/copy';
import { demoOwnerHasTasteTags } from '@/lib/demo-social';
import { isDemoShareToken } from '@/lib/demo-store';
import { useGiverCatalog } from '@/lib/giver-catalog';
import { groupGiftPhase } from '@/lib/pledges';
import { ownerTasteTagsHint, searchSharedWishlistItems } from '@/services/giver-social';

export default function GiverShareScreen() {
  const { token, meta, error, loading, refresh } = useGiverShare();
  const items = useGiverCatalog(token);
  const [focusGen, setFocusGen] = useState(0);
  const [query, setQuery] = useState('');
  const [hitIds, setHitIds] = useState<string[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setFocusGen((count) => count + 1);
      // Paint the catalog snapshot (Bought) before a silent refetch that may still
      // carry the previous Taken row.
      const frame = requestAnimationFrame(() => {
        void refresh({ silent: true });
      });
      return () => cancelAnimationFrame(frame);
    }, [refresh]),
  );

  const who = meta?.owner_display_name || meta?.owner_handle || 'a friend';
  const occasion = meta?.occasion_title;
  const readyToBuy = items.filter((item) => groupGiftPhase(item) === 'ready_to_buy');
  const visible = useMemo(() => {
    if (!hitIds) return items;
    const order = new Map(hitIds.map((id, index) => [id, index]));
    return items.filter((item) => order.has(item.id)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }, [hitIds, items]);

  const emptyHint =
    query.trim() && token && isDemoShareToken(token) ? ownerTasteTagsHint(demoOwnerHasTasteTags()) : null;

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
      <FlowHeader
        role="giver"
        title={meta?.title ?? (loading ? 'Opening link…' : 'Shared wishlist')}
        subtitle={
          meta
            ? `For ${who}${occasion ? ` · ${occasion}` : ''}. Tap a photo to reserve, chip in, or find it in AU stores. Broken buy links show Link may be broken — they won’t. Taken/bought stays between givers — no names.`
            : loading
              ? 'Opening link…'
              : 'This share token did not match a list.'
        }
      />

      <TextField
        label="Search gifts"
        value={query}
        onChangeText={(value) => void onSearch(value)}
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="linen, mug, trail…"
        hint="Filters this list. No tag shortcuts — type to search."
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
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      {readyToBuy.length > 0 ? <ReadyToBuyBanner items={readyToBuy} /> : null}
      <DeadLinkBanner items={items} />

      {!loading || visible.length > 0 ? (
        <ItemGrid
          key={`${token ?? 'share'}:${focusGen}:${query}`}
          items={visible}
          showStatus
          hrefFor={(item) => `/g/${token}/${item.id}`}
          emptyTitle={query.trim() ? 'Nothing matched' : PrettyCopy.giverEmptyTitle}
          emptyBody={query.trim() ? 'Try another word — titles and notes, not a tag cloud.' : PrettyCopy.giverEmptyBody}
          emptyActionLabel={query.trim() ? undefined : PrettyCopy.giverEmptyCta}
          onEmptyAction={query.trim() ? undefined : () => void remindThem()}
          emptyKind="giver"
        />
      ) : (
        <ThemedText themeColor="textSecondary">Loading gifts…</ThemedText>
      )}

      <LegalLinks />
    </Screen>
  );
}
