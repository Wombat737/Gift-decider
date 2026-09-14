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
    confidence.level === 'safe' ? theme.success : confidence.level === 'needs-size' ? theme.warning : theme.reserved;

  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: theme.backgroundElement }]}>
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
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 1,
  },
});
