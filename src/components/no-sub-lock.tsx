import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function NoSubLock({ compact = false }: { compact?: boolean }) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.row,
        compact && styles.compact,
        { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft },
      ]}>
      <ThemedText type="smallBold" themeColor="brand">
        {compact ? 'Locked' : 'No substitutes'}
      </ThemedText>
      {compact ? null : (
        <ThemedText type="small" themeColor="textSecondary">
          They want this exact thing. Don’t swap it for a “close enough”.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 2,
  },
  compact: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.one + 1,
  },
});
