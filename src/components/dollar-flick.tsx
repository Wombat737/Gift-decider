import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { CoralCoast } from '@/constants/coral-coast';
import { useTheme } from '@/hooks/use-theme';
import {
  DELIGHT_VARIANT,
  DOLLAR_FLICK_MS,
  REDUCE_MOTION_TOAST_MS,
  SPARK_TRAVEL_PX,
  endDelight,
} from '@/lib/delight';
import { hapticLight } from '@/lib/haptics';

type DollarFlickProps = {
  playKey: number;
};

const SPARKS = [
  { dx: SPARK_TRAVEL_PX, dy: 0, color: CoralCoast.brand },
  { dx: -SPARK_TRAVEL_PX * 0.7, dy: SPARK_TRAVEL_PX * 0.8, color: CoralCoast.accent },
  { dx: -SPARK_TRAVEL_PX * 0.7, dy: -SPARK_TRAVEL_PX * 0.8, color: CoralCoast.brand },
] as const;

function SparkDot({
  dx,
  dy,
  color,
  playKey,
  reduceMotion,
}: {
  dx: number;
  dy: number;
  color: string;
  playKey: number;
  reduceMotion: boolean;
}) {
  const opacity = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    if (!playKey || reduceMotion || DELIGHT_VARIANT !== 'v2') {
      opacity.value = 0;
      return;
    }
    opacity.value = 0;
    tx.value = 0;
    ty.value = 0;
    opacity.value = withDelay(
      500,
      withSequence(withTiming(1, { duration: 80 }), withTiming(0, { duration: 220 })),
    );
    tx.value = withDelay(500, withTiming(dx, { duration: 300, easing: Easing.out(Easing.cubic) }));
    ty.value = withDelay(500, withTiming(dy, { duration: 300, easing: Easing.out(Easing.cubic) }));
  }, [playKey, reduceMotion, dx, dy, opacity, tx, ty]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }, { translateY: ty.value }],
  }));

  return <Animated.View style={[styles.spark, { backgroundColor: color }, style]} />;
}

/** Giver-only purchased delight. Never mount on owner surfaces. Non-blocking. */
export function DollarFlick({ playKey }: DollarFlickProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (!playKey) return;

    if (reduceMotion) {
      scale.value = 1;
      translateY.value = 0;
      rotate.value = 0;
      opacity.value = 1;
      const hide = setTimeout(() => {
        opacity.value = 0;
        endDelight('flick');
      }, REDUCE_MOTION_TOAST_MS);
      return () => clearTimeout(hide);
    }

    void hapticLight();

    scale.value = 0.6;
    opacity.value = 0;
    translateY.value = 0;
    rotate.value = 0;

    const easeOut = Easing.out(Easing.cubic);
    opacity.value = withSequence(
      withTiming(1, { duration: 250, easing: easeOut }),
      withDelay(300, withTiming(0, { duration: 250 })),
    );
    scale.value = withSequence(
      withTiming(1.1, { duration: 250, easing: easeOut }),
      withTiming(1, { duration: 300 }),
    );
    translateY.value = withDelay(500, withTiming(-8, { duration: 300, easing: easeOut }));
    rotate.value = withDelay(500, withTiming(8, { duration: 300, easing: easeOut }));

    const done = setTimeout(() => endDelight('flick'), DOLLAR_FLICK_MS);
    return () => clearTimeout(done);
  }, [playKey, reduceMotion, opacity, rotate, scale, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  if (!playKey) return null;

  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.stage}>
      {SPARKS.map((spark, index) => (
        <SparkDot
          key={`${playKey}-${index}`}
          dx={spark.dx}
          dy={spark.dy}
          color={spark.color}
          playKey={playKey}
          reduceMotion={Boolean(reduceMotion)}
        />
      ))}
      <Animated.View style={[styles.wrap, style]}>
        <View style={[styles.badge, { backgroundColor: theme.successSoft }]}>
          <ThemedText type="titleSm" style={{ color: theme.success }}>
            $
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'absolute',
    right: -8,
    top: -18,
    zIndex: 4,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wrap: {
    zIndex: 5,
  },
  badge: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  spark: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    zIndex: 3,
  },
});
