import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { FlowHeader } from '@/components/flow-header';
import { ItemGrid } from '@/components/item-grid';
import { LegalLinks } from '@/components/legal-links';
import { ReadyToBuyBanner } from '@/components/ready-to-buy-banner';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { groupGiftPhase } from '@/lib/pledges';
import type { SharedWishlist, WishlistItem } from '@/lib/types';
import { getSharedItems, getSharedWishlist } from '@/services/wishlist';

export default function GiverShareScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [meta, setMeta] = useState<SharedWishlist | null>(null);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token || token === 'undefined') {
      setMeta(null);
      setItems([]);
      setError('This share link is missing a token.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextMeta, nextItems] = await Promise.all([getSharedWishlist(token), getSharedItems(token)]);
      setMeta(nextMeta);
      setItems(nextItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open this list');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const who = meta?.owner_display_name || meta?.owner_handle || 'a friend';
  const occasion = meta?.occasion_title;
  const readyToBuy = items.filter((item) => groupGiftPhase(item) === 'ready_to_buy');

  return (
    <Screen>
      <FlowHeader
        role="giver"
        title={meta?.title ?? (loading ? 'Opening link…' : 'Shared wishlist')}
        subtitle={
          meta
            ? `For ${who}${occasion ? ` · ${occasion}` : ''}. Tap a photo to reserve, chip in, or find it in AU stores. Taken/bought stays between givers — no names. They won’t see this view.`
            : loading
              ? 'Opening link…'
              : 'This share token did not match a list.'
        }
      />

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      {readyToBuy.length > 0 ? <ReadyToBuyBanner items={readyToBuy} /> : null}

      {!loading ? (
        <ItemGrid
          items={items}
          showStatus
          hrefFor={(item) => `/g/${token}/${item.id}`}
          emptyTitle="Nothing in this pack"
          emptyBody="This share link is valid but has no gifts yet. Ask them to pin a photo or assign items to the occasion."
        />
      ) : (
        <ThemedText themeColor="textSecondary">Loading gifts…</ThemedText>
      )}

      <LegalLinks />
    </Screen>
  );
}
