import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { track } from '@/lib/analytics';
import { env } from '@/lib/env';
import { accountDeletionMailto, privacyPolicyUrl, supportEmail } from '@/lib/legal';
import { getOwnProfile, updateOwnProfile } from '@/services/profile';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const version = Constants.expoConfig?.version ?? '0.4.0';
  const live = env.isSupabaseConfigured && !user?.demo;
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!live) return;
    void getOwnProfile()
      .then((profile) => {
        if (!profile) return;
        setDisplayName(profile.display_name ?? '');
        setHandle(profile.handle ?? '');
      })
      .catch(() => {
        setProfileMessage('Could not load profile. Apply supabase/migrations if this is a new project.');
      });
  }, [live]);

  async function onSaveProfile() {
    setSaving(true);
    setProfileMessage(null);
    try {
      const profile = await updateOwnProfile({ display_name: displayName, handle });
      setDisplayName(profile.display_name ?? '');
      setHandle(profile.handle ?? '');
      setProfileMessage('Profile saved.');
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

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

      {live ? (
        <Card>
          <ThemedText type="eyebrow" themeColor="brand">
            Profile
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Shown on giver share links (name / handle). Not used for surprise-safe gift status.
          </ThemedText>
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Jordan"
          />
          <TextField
            label="Handle"
            autoCapitalize="none"
            autoCorrect={false}
            value={handle}
            onChangeText={setHandle}
            placeholder="jordan"
            hint="3–30 characters: lowercase letters, numbers, underscore."
          />
          <Button label={saving ? 'Saving…' : 'Save profile'} disabled={saving} onPress={() => void onSaveProfile()} />
          {profileMessage ? (
            <ThemedText type="small" themeColor="textSecondary">
              {profileMessage}
            </ThemedText>
          ) : null}
        </Card>
      ) : null}

      <Card>
        <ThemedText type="eyebrow" themeColor="brand">
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
        <ThemedText type="eyebrow" themeColor="brand">
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
        <ThemedText type="eyebrow" themeColor="brand">
          Soft launch
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Version {version}
          {user?.demo ? ' · demo session' : env.isSupabaseConfigured ? ' · live Supabase' : ' · local demo'}. Analytics{' '}
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
