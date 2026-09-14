import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuBuyLinks } from '@/components/au-buy-links';
import { Button } from '@/components/button';
import { ConfidenceBadge } from '@/components/confidence-badge';
import { NoSubLock } from '@/components/no-sub-lock';
import { PledgePanel } from '@/components/pledge-panel';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { VibeChips } from '@/components/vibe-chips';
import { Radius, Spacing } from '@/constants/theme';
import { giverStatusLabel } from '@/lib/format';
import { isFunded } from '@/lib/pledges';
import type { ItemStatus, WishlistItem } from '@/lib/types';
import {
  addSharedPledge,
  getSharedItems,
  setSharedGroupGift,
  setSharedItemStatus,
} from '@/services/wishlist';
import { useTheme } from '@/hooks/use-theme';

export default function GiverItemScreen() {
  const theme = useTheme();
  const { token, itemId } = useLocalSearchParams<{ token: string; itemId: string }>();
  const [item, setItem] = useState<WishlistItem | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !itemId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await getSharedItems(token);
      setItem(items.find((entry) => entry.id === itemId) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this gift');
    } finally {
      setLoading(false);
    }
  }, [itemId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(status: ItemStatus) {
    if (!token || !item) return;
    setError(null);
    setBusy(true);
    try {
      setItem(await setSharedItemStatus(token, item.id, status, name.trim() || undefined));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update item');
    } finally {
      setBusy(false);
    }
  }

  async function toggleGroup(enabled: boolean) {
    if (!token || !item) return;
    setError(null);
    setBusy(true);
    try {
      setItem(await setSharedGroupGift(token, item.id, enabled));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update group gift');
    } finally {
      setBusy(false);
    }
  }

  async function onPledge(amount: number, pledgeName?: string) {
    if (!token || !item) return;
    const pledge = await addSharedPledge(token, item.id, amount, pledgeName);
    const items = await getSharedItems(token);
    const next = items.find((entry) => entry.id === item.id);
    setItem(next ?? { ...item, is_group_gift: true, pledges: [...(item.pledges ?? []), pledge] });
  }

  if (loading && !item) {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading gift…</ThemedText>
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <ThemedText>That gift is not on this shared list.</ThemedText>
      </Screen>
    );
  }

  const funded = isFunded(item);
  const tone = funded || item.status === 'purchased' ? theme.success : item.status === 'reserved' ? theme.reserved : theme.accent;
  const taken = item.status === 'reserved' || item.status === 'purchased';

  return (
    <Screen>
      <Image
        source={{ uri: item.image_url ?? 'https://picsum.photos/seed/giftdecider-empty/800/800' }}
        style={styles.image}
        contentFit="cover"
      />
      <View style={styles.block}>
        <ThemedText type="heading">{item.title || 'Untitled gift'}</ThemedText>
        <ThemedText type="smallBold" style={{ color: tone }}>
          {giverStatusLabel(item.status, funded)}
          {item.item_kind === 'vibe' ? ' · vibe' : ''}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Soft lock is honour-system. Other givers see Taken/Bought — not names.
        </ThemedText>
      </View>

      <ConfidenceBadge item={item} />
      {item.no_substitution ? <NoSubLock /> : null}
      {item.tags.length > 0 ? <VibeChips tags={item.tags} /> : null}
      {item.size_hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          Size / fit: {item.size_hint}
        </ThemedText>
      ) : null}
      {item.notes ? <ThemedText>{item.notes}</ThemedText> : null}

      <TextField
        label="Your name (optional, stored for the lock — not shown to other givers)"
        placeholder="Only used if we need to unwind a hold"
        value={name}
        onChangeText={setName}
      />
      <Button
        label={taken && item.status === 'reserved' ? 'Already taken — steal the lock?' : 'Soft-lock this'}
        onPress={() => void updateStatus('reserved')}
        disabled={busy}
      />
      <Button label="Mark purchased" variant="secondary" disabled={busy} onPress={() => void updateStatus('purchased')} />
      <Button label="Release hold" variant="ghost" disabled={busy} onPress={() => void updateStatus('available')} />

      <PledgePanel item={item} busy={busy} onToggleGroup={(enabled) => void toggleGroup(enabled)} onPledge={onPledge} />
      <AuBuyLinks item={item} />

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    backgroundColor: '#E5D8C8',
  },
  block: {
    gap: Spacing.one,
  },
});
