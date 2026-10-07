import { router } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useWishlist } from '@/context/wishlist-context';
import { PrettyCopy } from '@/lib/copy';
import { openGiverShare } from '@/lib/giver-catalog';
import { prefetchSharedItems } from '@/services/wishlist';

/** Quiet path from Stage home to the giver list. Share stays the other text link. */
export function PreviewGiverLink() {
  const token = useWishlist().wishlist?.share_token;

  return (
    <NativePressable
      accessibilityRole="link"
      accessibilityLabel={PrettyCopy.previewGiverLink}
      onPress={() => openGiverShare(token, router.push, prefetchSharedItems)}
      style={styles.hit}>
      <ThemedText type="bodyEm" themeColor="textSecondary" style={styles.label}>
        {PrettyCopy.previewGiverLink}
      </ThemedText>
    </NativePressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  label: {
    textAlign: 'center',
  },
});
