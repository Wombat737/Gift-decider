import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { COIN_TRICKLE_MS, endDelight } from '@/lib/delight';

const COINS = [0, 1, 2, 3];
const STAGGER_MS = 50;
const TRAVEL_MS = 600;

type CoinTrickleProps = {
  playKey: number;
};

function Coin({ index, playKey, reduceMotion }: { index: number; playKey: number; reduceMotion: boolean }) {
  const theme = useTheme();
  const startX = 12 + index * 14;
  const startY = 96;
  const endX = 48 + index * 6;
  const endY = 10;
  const x = useSharedValue(startX);
  const y = useSharedValue(startY);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (!playKey || reduceMotion) {
      opacity.value = 0;
      return;
    }
    const delay = index * STAGGER_MS;
    x.value = startX;
    y.value = startY;
    opacity.value = 0;
    const easeIn = Easing.in(Easing.cubic);
    opacity.value = withDelay(delay, withTiming(1, { duration: 80 }));
    x.value = withDelay(delay, withTiming(endX, { duration: TRAVEL_MS, easing: easeIn }));
    y.value = withDelay(delay, withTiming(endY, { duration: TRAVEL_MS, easing: easeIn }));
    opacity.value = withDelay(delay + TRAVEL_MS - 150, withTiming(0, { duration: 150 }));
  }, [playKey, reduceMotion, endX, opacity, startX, startY, x, y]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.coin,
        {
          backgroundColor: theme.accent,
          borderColor: theme.text,
        },
        style,
      ]}
    />
  );
}

/** Giver-only chip-in delight. Reanimated stub until a Lottie asset ships. Non-blocking. */
export function CoinTrickle({ playKey }: CoinTrickleProps) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!playKey) return;
    if (reduceMotion) {
      endDelight('trickle');
      return;
    }
    const done = setTimeout(() => endDelight('trickle'), COIN_TRICKLE_MS);
    return () => clearTimeout(done);
  }, [playKey, reduceMotion]);

  if (!playKey || reduceMotion) return null;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={styles.stage}>
      {COINS.map((index) => (
        <Coin key={`${playKey}-${index}`} index={index} playKey={playKey} reduceMotion={false} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    position: 'absolute',
    right: 8,
    top: 0,
    width: 80,
    height: 120,
    overflow: 'visible',
    zIndex: 4,
  },
  coin: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
});
