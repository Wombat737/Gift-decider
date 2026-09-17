import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { CoinTrickle } from '@/components/coin-trickle';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { PrettyCopy } from '@/lib/copy';
import { formatAud } from '@/lib/format';
import { formatRevealDate, isFunded, isRevealDue, itemPledges, pledgeRemaining, pledgeTotal } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

type GroupGiftStripProps = {
  item: WishlistItem;
  trickleKey?: number;
};

/** Giver-only pledge strip: sunshine bar, reveal date, PayID honour line. */
export function GroupGiftStrip({ item, trickleKey = 0 }: GroupGiftStripProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const total = pledgeTotal(item);
  const remaining = pledgeRemaining(item);
  const funded = isFunded(item);
  const revealed = isRevealDue(item);
  const target = item.target_amount;
  const ratio = target && target > 0 ? Math.min(1, total / target) : funded ? 1 : 0;
  const mates = itemPledges(item).length;
  const revealLabel = formatRevealDate(item.reveal_at);
  const progress = useSharedValue(ratio);

  useEffect(() => {
    progress.value = reduceMotion ? ratio : withTiming(ratio, { duration: 200 });
  }, [progress, ratio, reduceMotion]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));

  const amountLine = target
    ? `${formatAud(total)} of ${formatAud(target)} · ${mates} ${mates === 1 ? 'mate' : 'mates'}`
    : `${formatAud(total)} chipped in · ${mates} ${mates === 1 ? 'mate' : 'mates'}`;

  return (
    <View style={styles.wrap} accessibilityLabel="group-gift-strip">
      <View style={styles.barStage}>
        <View style={[styles.track, { backgroundColor: theme.accentSoft }]}>
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: theme.accent,
              },
              fillStyle,
            ]}
          />
        </View>
        <CoinTrickle playKey={trickleKey} />
      </View>
      <ThemedText type="bodyEm">{amountLine}</ThemedText>
      {funded ? (
        <ThemedText type="caption" themeColor="textSecondary">
          Funded
        </ThemedText>
      ) : remaining != null ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {formatAud(remaining)} to go
        </ThemedText>
      ) : null}
      <View style={styles.metaRow}>
        <View style={[styles.pill, { backgroundColor: theme.accentSoft, borderColor: theme.accentSoft }]}>
          <ThemedText type="caption" themeColor="accent">
            Reveal {revealLabel}
            {revealed ? ' · arrived' : ''}
          </ThemedText>
        </View>
      </View>
      <ThemedText type="caption" themeColor="textSecondary" accessibilityLabel="group-gift-payid">
        {PrettyCopy.chipInHonour}
        {item.pay_instructions ? ` ${item.pay_instructions}` : ''}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  barStage: {
    position: 'relative',
    width: '100%',
    minHeight: 10,
  },
  track: {
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
  },
});
