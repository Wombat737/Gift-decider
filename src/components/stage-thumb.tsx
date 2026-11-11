import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Fonts, StageShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isUnsafeImageUri, looksLikeImageUri } from '@/lib/item-image';
import { PICK_PULSE_MS, pickKindLabel, StageThumbRadius, StageThumbSize, thumbInitials } from '@/lib/stage-home';
import type { ItemKind } from '@/lib/types';

type StageThumbProps = {
  title?: string | null;
  seed: string;
  imageUrl?: string | null;
  /** Short pop after this pick is saved. */
  pop?: boolean;
};

/** Framed photo. Missing or broken art falls back to a coral–sunshine initial. */
export function StageThumb({ title, seed, imageUrl, pop = false }: StageThumbProps) {
  const theme = useTheme();
  const initials = thumbInitials(title);
  const raw = imageUrl?.trim() ?? '';
  const uri = raw && !isUnsafeImageUri(raw) && looksLikeImageUri(raw) ? raw : '';
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  useEffect(() => {
    if (!pop) {
      scale.value = 1;
      rotate.value = 0;
      glow.value = 0;
      return;
    }
    if (reduceMotion) {
      scale.value = 1;
      rotate.value = 0;
      glow.value = 1;
      return;
    }
    scale.value = 1;
    rotate.value = 0;
    glow.value = 0;
    scale.value = withSequence(
      withTiming(1.08, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: PICK_PULSE_MS - 180, easing: Easing.inOut(Easing.cubic) }),
    );
    rotate.value = withSequence(
      withTiming(-8, { duration: 120, easing: Easing.out(Easing.quad) }),
      withTiming(7, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      withTiming(-4, { duration: 140, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: PICK_PULSE_MS - 400, easing: Easing.out(Easing.quad) }),
    );
    glow.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: PICK_PULSE_MS - 160, easing: Easing.in(Easing.quad) }),
    );
  }, [glow, pop, reduceMotion, rotate, scale]);

  const motionStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotate.value}deg` }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.9,
  }));
  const showPhoto = Boolean(uri) && !failed;

  return (
    <Animated.View style={[styles.outer, motionStyle]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.ring, { borderColor: theme.accent }, ringStyle]}
      />
      <View
        accessibilityRole="image"
        accessibilityLabel={showPhoto ? `${title || 'Pick'} photo` : `${initials} placeholder`}
        style={[styles.thumb, StageShadow, { borderColor: theme.border, backgroundColor: theme.paper }]}>
        {showPhoto ? (
          <Image
            source={{ uri }}
            style={styles.image}
            contentFit="cover"
            pointerEvents="none"
            recyclingKey={`${seed}:${uri}`}
            onError={() => setFailed(true)}
          />
        ) : (
          <LinearGradient
            colors={['#E4DCCC', '#F3EFE6'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fallback}>
            <ThemedText style={[styles.letters, { color: theme.text }]}>{initials}</ThemedText>
          </LinearGradient>
        )}
      </View>
    </Animated.View>
  );
}

function KindMark({ kind, color }: { kind: ItemKind; color: string }) {
  const stroke = {
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };
  return (
    <Svg width={14} height={14} viewBox="0 0 14 14">
      {kind === 'vibe' ? (
        <Path d="M7 1.4 L8.05 5.05 L11.8 5.25 L9.05 7.55 L10.05 11.35 L7 9.35 L3.95 11.35 L4.95 7.55 L2.2 5.25 L5.95 5.05 Z" {...stroke} />
      ) : (
        <>
          <Path d="M7 2.1 V4.15 M7 9.85 V11.9 M2.1 7 H4.15 M9.85 7 H11.9" {...stroke} />
          <Path d="M7 4.7 A2.3 2.3 0 1 0 7 9.3 A2.3 2.3 0 1 0 7 4.7" {...stroke} />
        </>
      )}
    </Svg>
  );
}

/** Neutral kind marker. Same chrome for both — coral stays on primary actions. */
export function KindPill({ kind }: { kind: ItemKind }) {
  const theme = useTheme();
  const label = pickKindLabel(kind);
  return (
    <View style={[styles.pill, { backgroundColor: theme.paper, borderColor: theme.border }]}>
      <KindMark kind={kind} color={theme.textSecondary} />
      <ThemedText type="caption" style={{ color: theme.textSecondary, fontWeight: 600 }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: StageThumbSize,
    height: StageThumbSize,
    flexGrow: 0,
    flexShrink: 0,
  },
  ring: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: StageThumbRadius + 4,
    borderWidth: 2,
  },
  thumb: {
    width: StageThumbSize,
    height: StageThumbSize,
    borderRadius: StageThumbRadius,
    borderWidth: 1,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letters: {
    fontFamily: Fonts.serif,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: 600,
    letterSpacing: 0.4,
  },
  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
