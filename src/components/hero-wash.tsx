import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient, type LinearGradientProps } from 'expo-linear-gradient';

import { Radius, Spacing, Washes } from '@/constants/theme';

type HeroWashProps = Omit<LinearGradientProps, 'colors' | 'start' | 'end'> & {
  /** `hero` = coral→cream. `chipin` = sunshine→white, sheet header only. */
  variant?: 'hero' | 'chipin';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Soft Coral Coast wash for splash, empties, reveal, and chip-in headers. */
export function HeroWash({ variant = 'hero', children, style, ...rest }: HeroWashProps) {
  const colors = variant === 'chipin' ? Washes.chipin : Washes.hero;

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[styles.base, style]}
      {...rest}>
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: Radius.card,
    paddingVertical: Spacing.four,
    paddingHorizontal: Spacing.three,
    overflow: 'hidden',
  },
});
