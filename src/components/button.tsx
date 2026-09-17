import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  type PressableProps,
} from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'pledge';
  /**
   * TouchableOpacity (native responder), not Gesture Handler. Use for CTAs
   * mounted outside a ScrollView so a pan gesture cannot cancel the press.
   */
  nativePress?: boolean;
};

export function Button({ label, variant = 'primary', disabled, nativePress = false, ...rest }: ButtonProps) {
  const theme = useTheme();
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

  const labelNode = (
    <ThemedText type="smallBold" style={{ color, textAlign: 'center', pointerEvents: 'none' }}>
      {label}
    </ThemedText>
  );

  if (nativePress) {
    return (
      <TouchableOpacity
        key={label}
        accessibilityRole="button"
        disabled={disabled ?? false}
        activeOpacity={0.84}
        hitSlop={8}
        delayPressIn={0}
        style={face}
        onPress={rest.onPress ?? undefined}
        onPressIn={rest.onPressIn ?? undefined}
        onPressOut={rest.onPressOut ?? undefined}
        testID={rest.testID}
        accessibilityLabel={typeof rest.accessibilityLabel === 'string' ? rest.accessibilityLabel : undefined}>
        {labelNode}
      </TouchableOpacity>
    );
  }

  return (
    <NativePressable
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.84 : 1,
        },
      ]}
      {...rest}>
      {labelNode}
    </NativePressable>
  );
}

const styles = StyleSheet.create({
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
});
