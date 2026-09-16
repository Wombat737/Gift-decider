import { Platform, Pressable as RNPressable, StyleSheet, type PressableProps } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'pledge';
  /**
   * RN Pressable (not Gesture Handler). Use for CTAs mounted outside a
   * ScrollView so the native responder does not compete with a pan gesture.
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
  const PressableComponent = nativePress ? RNPressable : NativePressable;

  return (
    <PressableComponent
      accessibilityRole="button"
      disabled={disabled}
      hitSlop={nativePress ? 8 : undefined}
      pressRetentionOffset={nativePress ? 12 : undefined}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: background,
          borderColor,
          opacity: disabled ? 0.45 : pressed ? 0.84 : 1,
        },
      ]}
      {...rest}>
      <ThemedText type="smallBold" style={{ color, textAlign: 'center' }}>
        {label}
      </ThemedText>
    </PressableComponent>
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
