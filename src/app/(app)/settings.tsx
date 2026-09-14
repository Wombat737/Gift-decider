import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Platform } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { track } from '@/lib/analytics';
import { env } from '@/lib/env';
import { accountDeletionMailto, privacyPolicyUrl, supportEmail } from '@/lib/legal';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const version = Constants.expoConfig?.version ?? '0.4.0';

  async function onDelete() {
    track('deletion_requested');
    const url = accountDeletionMailto();
    if (Platform.OS === 'web') {
      await Linking.openURL(url);
      return;
    }
    Alert.alert(
      'Request account deletion',
      `This opens an email to ${supportEmail()}. There is no automated backend yet — we’ll process the request manually.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open mail',
          onPress: () => {
            void Linking.openURL(url);
          },
        },
      ],
    );
  }

  return (
    <Screen>
      <ThemedText type="heading">Settings</ThemedText>
      <ThemedText themeColor="textSecondary">
        Signed in as {user?.email ?? 'you'}. Store-required privacy and deletion live here.
      </ThemedText>

      <Card>
        <ThemedText type="eyebrow" themeColor="accent">
          Legal
        </ThemedText>
        <ThemedText type="smallBold">Privacy policy</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          How wishlists, share links, and surprise-safe reservations are handled. Override the URL with
          EXPO_PUBLIC_PRIVACY_POLICY_URL when you host a production page.
        </ThemedText>
        <ThemedText type="code">{privacyPolicyUrl()}</ThemedText>
        <Button
          label="Open privacy policy"
          onPress={() => {
            track('privacy_opened', { source: 'settings' });
            router.push('/privacy');
          }}
        />
      </Card>

      <Card>
        <ThemedText type="eyebrow" themeColor="accent">
          Your account
        </ThemedText>
        <ThemedText type="smallBold">Delete my account</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          App Store / Play requirement. Sends a mailto stub to {supportEmail()} until a backend mailer exists.
          Demo mode has nothing hosted to delete.
        </ThemedText>
        <Button label="Request account deletion" variant="secondary" onPress={() => void onDelete()} />
      </Card>

      <Card>
        <ThemedText type="eyebrow" themeColor="accent">
          Soft launch
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Version {version}
          {user?.demo ? ' · demo session' : env.isSupabaseConfigured ? ' · Supabase' : ' · local demo'}. Analytics{' '}
          {env.analyticsEnabled ? 'console stub on' : 'off'} — no paid product required.
        </ThemedText>
        <Button
          label="Sign out"
          variant="ghost"
          onPress={() => {
            void signOut().then(() => router.replace('/sign-in'));
          }}
        />
      </Card>
    </Screen>
  );
}
