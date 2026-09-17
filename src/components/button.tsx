import { useState } from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  type PressableProps,
} from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { FlairIcon, type FlairIconName } from '@/components/flair-icons';
import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, ShadowFloat, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { BUTTON_PRESS_MS, BUTTON_PRESS_SCALE } from '@/lib/delight';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'pledge';
  icon?: FlairIconName;
  /**
   * TouchableOpacity (native responder), not Gesture Handler. Use for CTAs
   * mounted outside a ScrollView so a pan gesture cannot cancel the press.
   */
  nativePress?: boolean;
};

const PRESS_EASING = Easing.out(Easing.cubic);

function usePressScale() {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function pressIn() {
    if (reduceMotion) return;
    scale.value = withTiming(BUTTON_PRESS_SCALE, { duration: BUTTON_PRESS_MS, easing: PRESS_EASING });
  }

  function pressOut() {
    scale.value = withTiming(1, { duration: BUTTON_PRESS_MS, easing: PRESS_EASING });
  }

  return { style, pressIn, pressOut };
}

export function Button({
  label,
  variant = 'primary',
  icon,
  disabled,
  nativePress = false,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const theme = useTheme();
  const { style: pressStyle, pressIn, pressOut } = usePressScale();
  const [pressed, setPressed] = useState(false);
  const lift = (variant === 'primary' || variant === 'pledge') && pressed && !disabled;

  function handlePressIn(...args: Parameters<NonNullable<PressableProps['onPressIn']>>) {
    setPressed(true);
    pressIn();
    onPressIn?.(...args);
  }
  function handlePressOut(...args: Parameters<NonNullable<PressableProps['onPressOut']>>) {
    setPressed(false);
    pressOut();
    onPressOut?.(...args);
  }
  const background =
    variant === 'primary'
      ? theme.brand
      : variant === 'pledge'
        ? theme.accent
        : variant === 'secondary'
          ? theme.backgroundElement
          : 'transparent';
  const color =
    variant === 'primary' || variant === 'pledge'
      ? variant === 'pledge'
        ? theme.accentText
        : theme.brandText
      : variant === 'ghost'
        ? theme.brandInk
        : theme.text;
  const borderColor =
    variant === 'secondary' ? theme.border : variant === 'ghost' ? 'transparent' : variant === 'pledge' ? theme.accent : theme.brand;
  const face = [
    styles.base,
    {
      backgroundColor: background,
      borderColor,
      opacity: disabled ? 0.45 : 1,
    },
  ];

  const labelNode = icon ? (
    <View style={styles.labelRow}>
      <FlairIcon name={icon} color={color} />
      <ThemedText type="bodyEm" style={{ color, textAlign: 'center', pointerEvents: 'none' }}>
        {label}
      </ThemedText>
    </View>
  ) : (
    <ThemedText type="bodyEm" style={{ color, textAlign: 'center', pointerEvents: 'none' }}>
      {label}
    </ThemedText>
  );

  const wrapStyle = [styles.scaleWrap, pressStyle, lift ? ShadowFloat : null];

  if (nativePress) {
    return (
      <Animated.View style={wrapStyle}>
        <TouchableOpacity
          key={label}
          accessibilityRole="button"
          disabled={disabled ?? false}
          activeOpacity={1}
          hitSlop={8}
          delayPressIn={0}
          style={face}
          onPress={rest.onPress ?? undefined}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          testID={rest.testID}
          accessibilityLabel={typeof rest.accessibilityLabel === 'string' ? rest.accessibilityLabel : undefined}>
          {labelNode}
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={wrapStyle}>
      <NativePressable
        {...rest}
        accessibilityRole="button"
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={face}>
        {labelNode}
      </NativePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scaleWrap: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
  },
  base: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 50,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    pointerEvents: 'none',
  },
});
