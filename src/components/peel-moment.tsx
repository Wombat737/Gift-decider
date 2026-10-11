import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Path, Rect } from 'react-native-svg';

import { CoralCoast } from '@/constants/coral-coast';
import { PEEL_MOMENT_MS, REDUCE_MOTION_TOAST_MS } from '@/lib/delight';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Sunshine under the card. opt2-peel-mark.svg, 1024 space. */
const SUNSHINE = 'M732 532 L532 732 Q520 600 548 556 Q592 520 732 532 Z';

/** Closed white card — rounded rect, corner still down. */
const CARD_CLOSED =
  'M348 292H676Q732 292 732 348V676Q732 732 676 732H348Q292 732 292 676V348Q292 292 348 292Z';

/**
 * Open card from opt2-peel-mark.svg. Bottom-right corner is the peel:
 * the cut runs from (732, 532) to (532, 732) and sunshine shows through.
 */
function peelCardD(cut: number) {
  'worklet';
  const t = Math.min(1, Math.max(0, cut));
  if (t < 0.03) return CARD_CLOSED;
  const y = Math.round((676 - 144 * t) * 10) / 10;
  const x = Math.round((732 - 200 * t) * 10) / 10;
  return `M348 292H676Q732 292 732 348V${y}L${x} 732H348Q292 732 292 676V348Q292 292 348 292Z`;
}

function PeelSvg({ size, lift }: { size: number; lift: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <G transform="scale(0.25)">
        <Rect width={1024} height={1024} rx={230} fill={CoralCoast.brand} />
        <Path d={SUNSHINE} fill={CoralCoast.accent} />
        <Path d={peelCardD(lift)} fill={CoralCoast.surface} />
      </G>
    </Svg>
  );
}

/** Settled peel mark. Empty-state art only — not a reservation signal. */
export function PeelArt({ size = 120 }: { size?: number }) {
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="A card with its corner peeled back"
      pointerEvents="none"
      style={{ width: size, height: size }}>
      <PeelSvg size={size} lift={1} />
    </View>
  );
}

type PeelMomentProps = {
  playKey: number;
  size?: number;
};

/**
 * Giver-only delight. The card corner peels open, sunshine shows, then it settles.
 * Callers fire hapticLight. Never mount this on an owner surface.
 */
export function PeelMoment({ playKey, size = 72 }: PeelMomentProps) {
  const reduceMotion = useReducedMotion();
  const lift = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  useEffect(() => {
    if (!playKey) return;

    if (reduceMotion) {
      lift.value = 1;
      scale.value = 1;
      opacity.value = 1;
      const hide = setTimeout(() => {
        opacity.value = 0;
      }, REDUCE_MOTION_TOAST_MS);
      return () => clearTimeout(hide);
    }

    const fadeIn = 80;
    const fadeOut = 100;
    const settle = 180;
    const open = PEEL_MOMENT_MS - fadeOut - settle;

    lift.value = 0;
    opacity.value = 0;
    scale.value = 0.94;
    opacity.value = withSequence(
      withTiming(1, { duration: fadeIn }),
      withDelay(
        PEEL_MOMENT_MS - fadeIn - fadeOut,
        withTiming(0, { duration: fadeOut, easing: Easing.out(Easing.quad) }),
      ),
    );
    lift.value = withTiming(1, { duration: open, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withTiming(1.04, { duration: open, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: settle, easing: Easing.inOut(Easing.quad) }),
    );
  }, [lift, opacity, playKey, reduceMotion, scale]);

  const cardProps = useAnimatedProps(() => ({
    d: peelCardD(lift.value),
  }));

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!playKey) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.moment, style]}>
      <Svg width={size} height={size} viewBox="0 0 256 256">
        <G transform="scale(0.25)">
          <Rect width={1024} height={1024} rx={230} fill={CoralCoast.brand} />
          <Path d={SUNSHINE} fill={CoralCoast.accent} />
          <AnimatedPath d={CARD_CLOSED} animatedProps={cardProps} fill={CoralCoast.surface} />
        </G>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  moment: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
