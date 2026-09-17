import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Share } from 'react-native';

import { DeadLinkBanner } from '@/components/dead-link-banner';
import { FlowHeader } from '@/components/flow-header';
import { ItemGrid } from '@/components/item-grid';
import { LegalLinks } from '@/components/legal-links';
import { ReadyToBuyBanner } from '@/components/ready-to-buy-banner';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useGiverShare } from '@/context/giver-share-context';
import { PrettyCopy, mateNudgeMessage } from '@/lib/copy';
import { useGiverCatalog } from '@/lib/giver-catalog';
import { groupGiftPhase } from '@/lib/pledges';

export default function GiverShareScreen() {
  const { token, meta, error, loading, refresh } = useGiverShare();
  const items = useGiverCatalog(token);
  const [focusGen, setFocusGen] = useState(0);

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

  async function remindThem() {
    const text = mateNudgeMessage();
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return;
    }
    await Share.share({ message: text });
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

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      {readyToBuy.length > 0 ? <ReadyToBuyBanner items={readyToBuy} /> : null}
      <DeadLinkBanner items={items} />

      {!loading || items.length > 0 ? (
        <ItemGrid
          key={`${token ?? 'share'}:${focusGen}`}
          items={items}
          showStatus
          hrefFor={(item) => `/g/${token}/${item.id}`}
          emptyTitle={PrettyCopy.giverEmptyTitle}
          emptyBody={PrettyCopy.giverEmptyBody}
          emptyActionLabel={PrettyCopy.giverEmptyCta}
          onEmptyAction={() => void remindThem()}
        />
      ) : (
        <ThemedText themeColor="textSecondary">Loading gifts…</ThemedText>
      )}

      <LegalLinks />
    </Screen>
  );
}
