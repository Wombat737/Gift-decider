import * as Linking from 'expo-linking';
import { Link, router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { privacyDestination } from '@/lib/legal';

type LegalLinksProps = {
  includeSettings?: boolean;
};

export function openPrivacyPolicy(source: string) {
  track('privacy_opened', { source });
  const destination = privacyDestination();
  if (destination.type === 'external') {
    void Linking.openURL(destination.url);
    return;
  }
  router.push('/privacy');
}

export function LegalLinks({ includeSettings = false }: LegalLinksProps) {
  return (
    <View style={styles.row}>
      <NativePressable
        accessibilityRole="link"
        accessibilityLabel="Privacy policy"
        onPress={() => openPrivacyPolicy('legal_links')}>
        <ThemedText type="small" themeColor="brand">
          Privacy policy
        </ThemedText>
      </NativePressable>
      <Link href="/terms" onPress={() => track('terms_opened', { source: 'legal_links' })}>
        <ThemedText type="small" themeColor="brand">
          Terms of use
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
    maxWidth: '100%',
  },
});
