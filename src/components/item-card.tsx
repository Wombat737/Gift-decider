import { Image } from 'expo-image';
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { NativePressable } from '@/components/native-pressable';
import { StatusChip } from '@/components/status-chip';
import { ThemedText } from '@/components/themed-text';
import { ChipPad, Radius, Spacing } from '@/constants/theme';
import { PrettyCopy } from '@/lib/copy';
import { giverStatusChip } from '@/lib/giver-status';
import { HEAL_BADGE, shouldRenderHealUi } from '@/lib/heal-link';
import { improvisedConfidence } from '@/lib/improv';
import { formatRevealDate, groupGiftPhase } from '@/lib/pledges';
import { ownerMomentTone } from '@/lib/tones';
import type { WishlistItem } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

type ItemCardProps = {
  item: WishlistItem;
  href?: Href;
  onPress?: () => void;
  /** Giver-only. Owners never see reserve/purchased/pledges — surprise gifts. */
  showStatus?: boolean;
  /** One-tap claim for an open gift. Stays off owner cards. */
  onClaim?: (item: WishlistItem) => void;
  claimBusy?: boolean;
};

export function ItemCard({ item, href, onPress, showStatus = false, onClaim, claimBusy = false }: ItemCardProps) {
  const theme = useTheme();
  const [pressed, setPressed] = useState(false);
  const confidence = showStatus ? improvisedConfidence(item) : null;
  const revealTone = ownerMomentTone();
  const statusChip = showStatus ? giverStatusChip(item) : null;
  const chipIn = showStatus && groupGiftPhase(item) === 'collecting';
  const canClaim = Boolean(showStatus && onClaim && item.status === 'available');

  const body = (
    <>
      <View style={[styles.imageWrap, { backgroundColor: theme.paper }]}>
        <Image
          source={{ uri: item.image_url ?? 'https://picsum.photos/seed/giftdecider-empty/800/800' }}
          style={styles.image}
          contentFit="cover"
          pointerEvents="none"
        />
      </View>
      <View style={styles.meta}>
        <ThemedText type="titleSm" numberOfLines={2}>
          {item.title || 'Untitled gift'}
        </ThemedText>
        {item.item_kind === 'vibe' ? (
          <ThemedText type="caption" themeColor="textSecondary">
            Vibe
          </ThemedText>
        ) : null}
        {!showStatus && item.tags.length > 0 ? (
          <ThemedText type="caption" themeColor="textSecondary" numberOfLines={1}>
            {item.tags.join(' · ')}
          </ThemedText>
        ) : null}
        {item.reveal ? (
          <ThemedText type="caption" themeColor={revealTone} accessibilityLabel="from-the-group">
            From the group
          </ThemedText>
        ) : null}
        {statusChip ? <StatusChip label={statusChip.label} tone={statusChip.tone} /> : null}
        {showStatus && item.is_group_gift && item.reveal_at ? (
          <ThemedText type="caption" themeColor="textSecondary" accessibilityLabel="giver-reveal-date">
            Reveal {formatRevealDate(item.reveal_at)}
          </ThemedText>
        ) : null}
        {showStatus && shouldRenderHealUi('giver', item) ? (
          <StatusChip label={HEAL_BADGE} tone="brand" />
        ) : null}
        {confidence ? (
          <ThemedText type="caption" themeColor="textSecondary">
            {confidence.label}
          </ThemedText>
        ) : null}
        {chipIn ? (
          <View style={[styles.chipIn, { backgroundColor: theme.accentSoft, borderColor: theme.accentSoft }]}>
            <ThemedText type="caption" themeColor="accent">
              {PrettyCopy.chipInCta}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </>
  );

  const claim = canClaim ? (
    <NativePressable
      accessibilityRole="button"
      accessibilityLabel={`${PrettyCopy.claimCta}, ${item.title || 'gift'}`}
      disabled={claimBusy}
      onPress={() => onClaim?.(item)}
      style={[styles.claimBtn, { backgroundColor: theme.brand, opacity: claimBusy ? 0.45 : 1 }]}>
      <ThemedText type="smallBold" style={[styles.claimLabel, { color: theme.brandText }]}>
        {claimBusy ? 'Saving…' : PrettyCopy.claimCta}
      </ThemedText>
    </NativePressable>
  ) : null;

  if (href) {
    return (
      <Card padded={false} selected={pressed} style={styles.card}>
        <Link href={href} asChild>
          <NativePressable
            style={styles.press}
            accessibilityRole="link"
            onPressIn={() => setPressed(true)}
            onPressOut={() => setPressed(false)}>
            {body}
          </NativePressable>
        </Link>
        {claim}
      </Card>
    );
  }

  return (
    <Card padded={false} selected={pressed} style={styles.card}>
      <NativePressable
        onPress={onPress}
        style={styles.press}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}>
        {body}
      </NativePressable>
      {claim}
    </Card>
  );
}

const styles = StyleSheet.create({
  press: {
    flex: 1,
    minWidth: 0,
    maxWidth: '100%',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  card: {
    flex: 1,
    minWidth: 0,
    gap: 0,
    padding: Spacing.three,
    paddingBottom: Spacing.two,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 4 / 5,
    overflow: 'hidden',
    borderRadius: Radius.card - 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  meta: {
    gap: Spacing.one + 2,
    paddingTop: Spacing.twoHalf,
  },
  chipIn: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: ChipPad.horizontal,
    paddingVertical: ChipPad.vertical,
  },
  claimBtn: {
    marginTop: Spacing.two,
    minHeight: 40,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  claimLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600',
    letterSpacing: -0.15,
    textAlign: 'center',
  },
});
