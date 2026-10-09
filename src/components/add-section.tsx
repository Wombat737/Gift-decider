import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';

type AddSectionProps = {
  label: string;
  children: ReactNode;
};

/** Soft coral-to-sunshine frame. The fill stays cream so the form stays calm. */
export function AddSection({ label, children }: AddSectionProps) {
  return (
    <LinearGradient
      colors={['#F6C9C2', '#F6E2B4'] as const}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.frame}>
      <View style={styles.inner}>
        <ThemedText type="eyebrow" themeColor="brand">
          {label}
        </ThemedText>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: '100%',
    borderRadius: Radius.card + 2,
    padding: 1.5,
  },
  inner: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    gap: Spacing.three,
    borderRadius: Radius.card,
    backgroundColor: '#FFF9F6',
    padding: Spacing.three,
  },
});
