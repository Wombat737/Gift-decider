import { StyleSheet, View } from 'react-native';

import { HelpTip } from '@/components/help-tip';
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
    <View style={styles.row}>
      <View style={[styles.badge, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <ThemedText type="smallBold" style={{ color }}>
          {confidence.label}
        </ThemedText>
      </View>
      <HelpTip title={confidence.label} body={confidence.reason} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    maxWidth: '100%',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 2,
  },
});
