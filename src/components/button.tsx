import { Platform, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonProps = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'pledge';
};

export function Button({ label, variant = 'primary', disabled, ...rest }: ButtonProps) {
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

  return (
    <Pressable
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
      <ThemedText type="smallBold" style={{ color, textAlign: 'center' }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    maxWidth: '100%',
    minHeight: 50,
    borderRadius: Radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
});
