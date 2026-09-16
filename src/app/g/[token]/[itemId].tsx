import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuBuyLinks } from '@/components/au-buy-links';
import { Button } from '@/components/button';
import { ConfidenceBadge } from '@/components/confidence-badge';
import { LinkHealPanel } from '@/components/link-heal-panel';
import { NoSubLock } from '@/components/no-sub-lock';
import { PledgePanel } from '@/components/pledge-panel';
import { Screen } from '@/components/screen';
import { StatusChip } from '@/components/status-chip';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { VibeChips } from '@/components/vibe-chips';
import { Radius, Spacing } from '@/constants/theme';
import { useGiverShare } from '@/context/giver-share-context';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { isDemoShareToken } from '@/lib/demo-store';
import { patchGiverCatalog, pickSharedItem, shareTokenParam, useGiverCatalog } from '@/lib/giver-catalog';
import { applyItemStatus, giverStatusChip } from '@/lib/giver-status';
import type { DeliveryMethod, ItemStatus, WishlistItem } from '@/lib/types';
import {
  addSharedPledge,
  getSharedItems,
  markSharedItemFunded,
  runDemoLinkCheck,
  setSharedDelivery,
  setSharedGroupGift,
  setSharedItemStatus,
  setSharedLinkDead,
  setSharedOrganiser,
  setSharedPayInstructions,
  setSharedRevealAt,
  simulateSharedFunded,
  simulateSharedReveal,
} from '@/services/wishlist';

export default function GiverItemScreen() {
  const theme = useTheme();
  const { token: paramToken, itemId: paramItemId } = useLocalSearchParams<{ token: string; itemId: string }>();
  const { token: shareToken, items, loading: shareLoading, patchItem } = useGiverShare();
  const token = shareToken ?? shareTokenParam(paramToken);
  const itemId = shareTokenParam(paramItemId);
  const catalogItems = useGiverCatalog(token);
  const shareItem = pickSharedItem(itemId, catalogItems, items);
  const [item, setItem] = useState<WishlistItem | null>(shareItem);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!shareItem);
  const [busy, setBusy] = useState(false);
  const autoChecked = useRef<string | null>(null);
  const demo = Boolean(token && isDemoShareToken(token));

  useEffect(() => {
    if (shareItem) {
      setItem(shareItem);
      setLoading(false);
    }
  }, [shareItem]);

  useEffect(() => {
    if (!token || !itemId || shareItem) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getSharedItems(token)
      .then((nextItems) => {
        if (cancelled) return;
        const next = nextItems.find((entry) => entry.id === itemId) ?? null;
        if (next) patchItem(next);
        setItem(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this gift');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [itemId, patchItem, shareItem, token]);

  function commitItem(next: WishlistItem) {
    setItem(next);
    patchItem(next);
    if (token) patchGiverCatalog(token, next);
  }

  const current = shareItem ?? item;

  async function updateStatus(status: ItemStatus) {
    if (!current) return;
    if (!token) {
      setError('This share link is missing a token.');
      return;
    }
    setError(null);
    setBusy(true);
    const snapshot = current;
    commitItem(applyItemStatus(snapshot, status, name.trim() || undefined));
    try {
      commitItem(await setSharedItemStatus(token, snapshot.id, status, name.trim() || undefined));
      track('giver_status', { status });
    } catch (err) {
      commitItem(snapshot);
      setError(err instanceof Error ? err.message : 'Could not update item');
    } finally {
      setBusy(false);
    }
  }

  async function toggleGroup(
    enabled: boolean,
    revealAt?: string | null,
    organiserName?: string | null,
    payInstructions?: string | null,
  ) {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await setSharedGroupGift(token, current.id, enabled, revealAt, organiserName, payInstructions));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update group gift');
    } finally {
      setBusy(false);
    }
  }

  async function onSetRevealAt(revealAt: string) {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await setSharedRevealAt(token, current.id, revealAt));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save reveal date');
    } finally {
      setBusy(false);
    }
  }

  async function onPledge(amount: number, pledgeName?: string) {
    if (!token || !current) return;
    const pledge = await addSharedPledge(token, current.id, amount, pledgeName);
    const nextItems = await getSharedItems(token);
    const next = nextItems.find((entry) => entry.id === current.id);
    commitItem(next ?? { ...current, is_group_gift: true, pledges: [...(current.pledges ?? []), pledge] });
  }

  async function onMarkFunded() {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await markSharedItemFunded(token, current.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark funded');
    } finally {
      setBusy(false);
    }
  }

  async function onSimulateFunded() {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await simulateSharedFunded(token, current.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not simulate funding');
    } finally {
      setBusy(false);
    }
  }

  async function onSetOrganiser(organiserName: string) {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await setSharedOrganiser(token, current.id, organiserName));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save organiser');
    } finally {
      setBusy(false);
    }
  }

  async function onSetPayInstructions(payInstructions: string) {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await setSharedPayInstructions(token, current.id, payInstructions));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save pay instructions');
    } finally {
      setBusy(false);
    }
  }

  async function onSetDelivery(method: DeliveryMethod, note?: string | null) {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await setSharedDelivery(token, current.id, method, note));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save delivery');
    } finally {
      setBusy(false);
    }
  }

  async function onSimulateReveal(which: 'today' | 'yesterday') {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await simulateSharedReveal(token, current.id, which));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not simulate reveal date');
    } finally {
      setBusy(false);
    }
  }

  async function onMarkDead(dead: boolean) {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await setSharedLinkDead(token, current.id, dead));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update link');
    } finally {
      setBusy(false);
    }
  }

  async function onCheckLink() {
    if (!token || !current) return;
    setError(null);
    setBusy(true);
    try {
      commitItem(await runDemoLinkCheck(token, current));
      track('heal_link_check', { demo });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check link');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!demo || !token || !current?.buy_url || autoChecked.current === current.id) return;
    autoChecked.current = current.id;
    void onCheckLink();
    // Demo auto-check once per item so a known-bad buy URL is clickable without a live HEAD.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot on item id
  }, [demo, token, current?.id, current?.buy_url]);

  if ((loading || shareLoading) && !current) {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading gift…</ThemedText>
      </Screen>
    );
  }

  if (!current) {
    return (
      <Screen>
        <ThemedText>That gift is not on this shared list.</ThemedText>
      </Screen>
    );
  }

  const statusChip = giverStatusChip(current);
  const taken = current.status === 'reserved' || current.status === 'purchased';

  return (
    <Screen>
      <Image
        source={{ uri: current.image_url ?? 'https://picsum.photos/seed/giftdecider-empty/800/800' }}
        style={[styles.image, { backgroundColor: theme.paper }]}
        contentFit="cover"
        pointerEvents="none"
      />
      <View style={styles.block}>
        <ThemedText type="eyebrow" themeColor="brand">
          Giver view · they won’t see this
        </ThemedText>
        <ThemedText type="heading">{current.title || 'Untitled gift'}</ThemedText>
        <StatusChip
          label={`${statusChip.label}${current.item_kind === 'vibe' ? ' · vibe' : ''}`}
          tone={statusChip.tone}
        />
        <ThemedText type="small" themeColor="textSecondary">
          Soft lock is honour-system. Other givers see Taken/Bought — not names.
        </ThemedText>
      </View>

      <ConfidenceBadge item={current} />
      {current.no_substitution ? <NoSubLock /> : null}
      {current.tags.length > 0 ? <VibeChips tags={current.tags} /> : null}
      {current.size_hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          Size / fit: {current.size_hint}
        </ThemedText>
      ) : null}
      {current.notes ? <ThemedText>{current.notes}</ThemedText> : null}

      <TextField
        label="Your name (optional, stored for the lock — not shown to other givers)"
        placeholder="Only used if we need to unwind a hold"
        value={name}
        onChangeText={setName}
      />
      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}
      <Button
        label={taken && current.status === 'reserved' ? 'Already taken — steal the lock?' : 'Soft-lock this'}
        onPress={() => void updateStatus('reserved')}
        disabled={busy}
      />
      <Button label="Mark purchased" variant="secondary" disabled={busy} onPress={() => void updateStatus('purchased')} />
      <Button label="Release hold" variant="ghost" disabled={busy} onPress={() => void updateStatus('available')} />

      <PledgePanel
        item={current}
        busy={busy}
        demo={demo}
        defaultOrganiserName={name.trim() || undefined}
        onToggleGroup={(enabled, revealAt, organiserName, payInstructions) =>
          void toggleGroup(enabled, revealAt, organiserName, payInstructions)
        }
        onSetRevealAt={(revealAt) => void onSetRevealAt(revealAt)}
        onSetOrganiser={(organiserName) => void onSetOrganiser(organiserName)}
        onSetPayInstructions={(value) => void onSetPayInstructions(value)}
        onSetDelivery={(method, note) => void onSetDelivery(method, note)}
        onPledge={onPledge}
        onMarkFunded={() => void onMarkFunded()}
        onMarkPurchased={() => void updateStatus('purchased')}
        onSimulateFunded={() => void onSimulateFunded()}
        onSimulateReveal={(which) => void onSimulateReveal(which)}
      />
      <LinkHealPanel
        item={current}
        busy={busy}
        demo={demo}
        onMarkDead={(dead) => void onMarkDead(dead)}
        onCheckLink={() => void onCheckLink()}
      />
      <AuBuyLinks item={current} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.card,
    flexGrow: 0,
    flexShrink: 0,
  },
  block: {
    gap: Spacing.one,
  },
});
