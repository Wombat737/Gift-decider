import { Link, type Href } from 'expo-router';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { KindPill, StageThumb } from '@/components/stage-thumb';
import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, StageShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PICK_PULSE_MS, pickKindLabel } from '@/lib/stage-home';
import type { WishlistItem } from '@/lib/types';

type StagePickRowProps = {
  item: WishlistItem;
  href: Href;
  pulse?: boolean;
};

/** Owner home row. Title + Exact/Taste only — no reserve, purchase, or pledge chrome. */
export function StagePickRow({ item, href, pulse = false }: StagePickRowProps) {
  const theme = useTheme();
  const title = item.title || 'Untitled gift';
  const kind = pickKindLabel(item.item_kind);
  const reduceMotion = useReducedMotion();
  const glow = useSharedValue(0);
  const resting = theme.border;
  const sunshine = theme.accent;

  useEffect(() => {
    if (!pulse) {
      glow.value = 0;
      return;
    }
    if (reduceMotion) {
      glow.value = 1;
      const timer = setTimeout(() => {
        glow.value = 0;
      }, PICK_PULSE_MS);
      return () => clearTimeout(timer);
    }
    glow.value = 0;
    glow.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: PICK_PULSE_MS - 220, easing: Easing.in(Easing.quad) }),
    );
  }, [glow, pulse, reduceMotion]);

  const frameStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(glow.value, [0, 1], [resting, sunshine]),
  }));
  const washStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.22,
  }));

  return (
    <Animated.View
      style={[
        styles.card,
        StageShadow,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        frameStyle,
      ]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.wash, { backgroundColor: theme.accent }, washStyle]}
      />
      <Link href={href} asChild>
        <NativePressable
          accessibilityRole="link"
          accessibilityLabel={`${title}, ${kind}`}
          style={styles.row}>
          <StageThumb title={title} seed={item.id} />
          <View style={styles.copy}>
            <ThemedText type="titleSm" numberOfLines={2}>
              {title}
            </ThemedText>
            <KindPill label={kind} />
          </View>
        </NativePressable>
      </Link>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
  },
  wash: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.card,
  },
});
