import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { improvisedConfidence } from '@/lib/improv';
import type { WishlistItem } from '@/lib/types';

export function ConfidenceBadge({ item }: { item: WishlistItem }) {
  const theme = useTheme();
  const confidence = improvisedConfidence(item);
  const color =
    confidence.level === 'safe' ? theme.brandInk : confidence.level === 'needs-size' ? theme.warning : theme.reserved;

  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ color }}>
          {confidence.label}
        </ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {confidence.reason}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
});
