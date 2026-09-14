import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { supportEmail } from '@/lib/legal';

export default function PrivacyScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Privacy' }} />
      <ThemedText type="heading">Privacy policy</ThemedText>
      <ThemedText themeColor="textSecondary">
        Stub for store listings and mate-sharing. Replace EXPO_PUBLIC_PRIVACY_POLICY_URL when Gift Decider has a
        production domain. Name still parked.
      </ThemedText>

      <Card>
        <ThemedText type="smallBold">What we collect</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          If you sign in: email (magic link) and the photos, notes, vibes, and buy URLs you pin. Share links use a
          random token. Givers may leave an optional name on a soft-lock or chip-in — other givers see Taken/Bought,
          not names. Recipients never see in-flight reservations or pledge amounts.
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="smallBold">Demo mode</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          The GitHub Pages demo stores sample data in your browser (localStorage). Nothing is sent to a server unless
          you configure Supabase.
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="smallBold">What we don’t do</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          No Instagram scrapers, no Meta OAuth, no sale of personal data, no paid analytics account in this build.
          AU store buttons are plain search links.
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="smallBold">Account deletion</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Signed-in people can request deletion from Settings. That currently opens mail to {supportEmail()}. We’ll
          delete hosted account data when a production Supabase project exists. Demo-only data can be cleared by
          signing out and wiping site data.
        </ThemedText>
      </Card>

      <ThemedText type="small" themeColor="textSecondary" style={styles.foot}>
        Last updated 14 September 2026. This is an operational stub, not legal advice.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  foot: {
    paddingBottom: Spacing.four,
  },
});
