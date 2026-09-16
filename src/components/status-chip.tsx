import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { GiverChipTone } from '@/lib/tones';

type StatusChipProps = {
  label: string;
  /** Giver-only. Do not render on owner surfaces. */
  tone?: GiverChipTone;
};

export function StatusChip({ label, tone = 'muted' }: StatusChipProps) {
  const theme = useTheme();
  const color =
    tone === 'brand'
      ? theme.brandInk
      : tone === 'reserved'
        ? theme.reserved
        : tone === 'accent'
          ? theme.accentInk
          : theme.textSecondary;
  const background =
    tone === 'brand'
      ? theme.brandSoft
      : tone === 'accent'
        ? theme.accentMuted
        : tone === 'reserved'
          ? theme.reservedSoft
          : theme.background;
  const border =
    tone === 'brand'
      ? theme.brandSoft
      : tone === 'accent'
        ? theme.accentMuted
        : tone === 'reserved'
          ? theme.reservedSoft
          : theme.border;

  return (
    <View
      style={[styles.chip, { backgroundColor: background, borderColor: border }]}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
  },
});
