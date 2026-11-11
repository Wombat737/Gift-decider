import { StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A clearly labelled example so an empty list still shows how a pick reads. */
export function SamplePick({ onDismiss }: { onDismiss: () => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <ThemedText type="eyebrow" themeColor="brand">
        Example
      </ThemedText>
      <ThemedText type="title">Pyjamas</ThemedText>
      <ThemedText themeColor="textSecondary">Peter Alexander</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        This isn’t on your list. Dismiss it when you add your own.
      </ThemedText>
      <NativePressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss example pick"
        onPress={onDismiss}
        style={styles.hit}>
        <ThemedText type="bodyEm">Dismiss example</ThemedText>
      </NativePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.card,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  hit: {
    minHeight: 44,
    justifyContent: 'center',
  },
});
