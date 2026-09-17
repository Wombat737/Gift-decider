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
import { useTheme } from '@/hooks/use-theme';
import { DOLLAR_FLICK_MS, REDUCE_MOTION_TOAST_MS, endDelight } from '@/lib/delight';

type DollarFlickProps = {
  playKey: number;
};

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
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.wrap, style]}>
      <View style={[styles.badge, { backgroundColor: theme.successSoft }]}>
        <ThemedText type="titleSm" style={{ color: theme.success }}>
          $
        </ThemedText>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    right: -8,
    top: -18,
    zIndex: 4,
  },
  badge: {
    minWidth: 32,
    minHeight: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
