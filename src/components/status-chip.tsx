import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type StatusChipProps = {
  label: string;
  tone?: 'accent' | 'success' | 'reserved' | 'muted';
};

export function StatusChip({ label, tone = 'muted' }: StatusChipProps) {
  const theme = useTheme();
  const color =
    tone === 'success' ? theme.success : tone === 'reserved' ? theme.reserved : tone === 'accent' ? theme.accent : theme.textSecondary;

  return (
    <View style={[styles.chip, { backgroundColor: theme.background, borderColor: theme.border }]}>
      <ThemedText type="smallBold" style={{ color }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
  },
});
