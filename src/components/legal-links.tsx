import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';

type LegalLinksProps = {
  includeSettings?: boolean;
};

export function LegalLinks({ includeSettings = false }: LegalLinksProps) {
  return (
    <View style={styles.row}>
      <Link href="/privacy" onPress={() => track('privacy_opened', { source: 'legal_links' })}>
        <ThemedText type="small" themeColor="brand">
          Privacy policy
        </ThemedText>
      </Link>
      {includeSettings ? (
        <Link href="/settings" onPress={() => track('settings_opened', { source: 'legal_links' })}>
          <ThemedText type="small" themeColor="brand">
            Settings
          </ThemedText>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
});
