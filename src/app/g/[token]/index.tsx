import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';

import { DeadLinkBanner } from '@/components/dead-link-banner';
import { FlowHeader } from '@/components/flow-header';
import { ItemGrid } from '@/components/item-grid';
import { LegalLinks } from '@/components/legal-links';
import { ReadyToBuyBanner } from '@/components/ready-to-buy-banner';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useGiverShare } from '@/context/giver-share-context';
import { useGiverCatalog } from '@/lib/giver-catalog';
import { groupGiftPhase } from '@/lib/pledges';

export default function GiverShareScreen() {
  const { token, meta, error, loading, refresh } = useGiverShare();
  const items = useGiverCatalog(token);

  useFocusEffect(
    useCallback(() => {
      void refresh({ silent: true });
    }, [refresh]),
  );

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
            ? `For ${who}${occasion ? ` · ${occasion}` : ''}. Tap a photo to reserve, chip in, or find it in AU stores. Broken buy links show Link may be broken — they won’t. Taken/bought stays between givers — no names.`
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
      <DeadLinkBanner items={items} />

      {!loading || items.length > 0 ? (
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
