import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { CoinTrickle } from '@/components/coin-trickle';
import { FlairIcon } from '@/components/flair-icons';
import { HeroWash } from '@/components/hero-wash';
import { ThemedText } from '@/components/themed-text';
import { ChipPad, Radius, Spacing } from '@/constants/theme';
import { PrettyCopy } from '@/lib/copy';
import { BAR_PULSE_MS, DELIGHT_VARIANT } from '@/lib/delight';
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
  const pulse = useSharedValue(1);

  useEffect(() => {
    progress.value = reduceMotion ? ratio : withTiming(ratio, { duration: 200 });
  }, [progress, ratio, reduceMotion]);

  useEffect(() => {
    if (!trickleKey) return;
    if (reduceMotion || DELIGHT_VARIANT !== 'v2') {
      pulse.value = 1;
      return;
    }
    const land = Math.max(0, 600);
    const half = BAR_PULSE_MS / 2;
    const done = setTimeout(() => {
      pulse.value = withSequence(
        withTiming(1.02, { duration: half }),
        withTiming(1, { duration: half }),
      );
    }, land);
    return () => clearTimeout(done);
  }, [pulse, reduceMotion, trickleKey]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.round(progress.value * 100)}%`,
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const amountLine = target
    ? `${formatAud(total)} of ${formatAud(target)} · ${mates} ${mates === 1 ? 'mate' : 'mates'}`
    : `${formatAud(total)} chipped in · ${mates} ${mates === 1 ? 'mate' : 'mates'}`;

  return (
    <View style={styles.wrap} accessibilityLabel="group-gift-strip">
      <HeroWash variant="chipin" style={styles.header}>
        <Animated.View style={[styles.barStage, pulseStyle]}>
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
        </Animated.View>
        <ThemedText type="bodyEm">{amountLine}</ThemedText>
      </HeroWash>
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
      <View style={styles.honour}>
        <FlairIcon name="payid" color={theme.accentInk} size={20} />
        <ThemedText type="caption" themeColor="textSecondary" accessibilityLabel="group-gift-payid" style={styles.honourText}>
          {PrettyCopy.chipInHonour}
        </ThemedText>
      </View>
      {item.pay_instructions ? (
        <ThemedText type="caption" themeColor="textSecondary">
          {item.pay_instructions}
        </ThemedText>
      ) : null}
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
  header: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
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
    borderWidth: 2,
    paddingHorizontal: ChipPad.horizontal,
    paddingVertical: ChipPad.vertical,
  },
  honour: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
  },
  honourText: {
    flexShrink: 1,
  },
});
