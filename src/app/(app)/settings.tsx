import Constants from 'expo-constants';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { openPrivacyPolicy } from '@/components/legal-links';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { HeaderInboxLink } from '@/components/inbox-badge';
import { InboxBanner } from '@/components/inbox-banner';
import { Screen } from '@/components/screen';
import { StageStickyHeader } from '@/components/stage-sticky-header';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { PrettyCopy } from '@/lib/copy';
import { acceptBannerText, requestBannerText } from '@/lib/inbox';
import { track } from '@/lib/analytics';
import { env } from '@/lib/env';
import { deleteOwnAccount } from '@/services/account';
import { getOwnProfile, updateOwnProfile } from '@/services/profile';
import { TasteTagEditor } from '@/components/taste-tag-editor';
import { FilterChips } from '@/components/vibe-chips';
import { HelpFaq } from '@/lib/help';
import type { Discoverability } from '@/lib/types';

export default function SettingsScreen() {
  const { user, signOut } = useAuth();
  const { pendingRequests, newlyReady, requests, refreshInbox } = useInbox();
  const version = Constants.expoConfig?.version ?? '0.4.0';
  const live = env.isSupabaseConfigured && !user?.demo;
  const requestCopy = requestBannerText(requests);
  const readyCopy = acceptBannerText(newlyReady);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [discoverability, setDiscoverability] = useState<Discoverability>('handle');
  const [tasteTags, setTasteTags] = useState<string[]>([]);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refreshInbox();
    }, [refreshInbox]),
  );

  useEffect(() => {
    void getOwnProfile()
      .then((profile) => {
        if (!profile) return;
        setDisplayName(profile.display_name ?? '');
        setHandle(profile.handle ?? '');
        setDiscoverability(profile.discoverability ?? 'handle');
        setTasteTags(profile.taste_tags ?? []);
      })
      .catch(() => {
        setProfileMessage('Could not load your profile. Try again in a moment.');
      });
  }, []);

  async function onSaveProfile() {
    setSaving(true);
    setProfileMessage(null);
    try {
      const profile = await updateOwnProfile({
        display_name: displayName,
        handle,
        discoverability,
        taste_tags: tasteTags,
      });
      setDisplayName(profile.display_name ?? '');
      setHandle(profile.handle ?? '');
      setDiscoverability(profile.discoverability ?? 'handle');
      setTasteTags(profile.taste_tags ?? []);
      setProfileMessage('Profile saved.');
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Could not save profile');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (deleteText.trim().toUpperCase() !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);
    track('deletion_requested');
    try {
      if (!live) {
        setDeleteError('Explore demo stays on this device. Sign out to leave it. There’s no saved account to delete.');
        return;
      }
      await deleteOwnAccount();
      try {
        await signOut();
      } catch {
        // The account is already gone. signOut still clears the local session.
      }
      router.replace('/sign-in');
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Couldn’t delete your account. Try again.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen sticky={<StageStickyHeader title={PrettyCopy.ownerHomeTitle} />}>
      <ThemedText type="heading">Me</ThemedText>
      <ThemedText themeColor="textSecondary">Signed in as {user?.email ?? 'you'}.</ThemedText>

      <Card>
        <ThemedText type="eyebrow" themeColor="brand">
          People
        </ThemedText>
        <HeaderInboxLink
          label="People"
          count={newlyReady.length}
          accessibilityLabel={PrettyCopy.peopleTitle}
          onPress={() => router.push('/people')}
        />
        <HeaderInboxLink
          label="Requests"
          count={pendingRequests}
          accessibilityLabel={PrettyCopy.requestsTitle}
          onPress={() => router.push('/requests')}
        />
      </Card>
      {requestCopy ? (
        <InboxBanner
          title="Someone’s waiting"
          body={requestCopy}
          actionLabel={PrettyCopy.requestsBannerCta}
          onAction={() => router.push('/requests')}
          accessibilityLabel="pending-giver-requests"
        />
      ) : null}
      {readyCopy ? (
        <InboxBanner
          title="They’re ready"
          body={readyCopy}
          actionLabel={PrettyCopy.peopleTitle}
          onAction={() => router.push('/people')}
          accessibilityLabel="accepted-giver-pins"
        />
      ) : null}

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
          <ThemedText type="smallBold">Discoverability</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Handle search never matches your display name. Share links always work.
          </ThemedText>
          <FilterChips
            options={[
              { id: 'handle', label: 'Anyone with handle' },
              { id: 'private', label: 'Only people with my link' },
            ]}
            value={discoverability}
            onChange={(id) => setDiscoverability(id === 'private' ? 'private' : 'handle')}
          />
          <TasteTagEditor tags={tasteTags} onChange={setTasteTags} />
          <Button label={saving ? 'Saving…' : 'Save profile'} disabled={saving} onPress={() => void onSaveProfile()} />
          {profileMessage ? (
            <ThemedText type="small" themeColor="textSecondary">
              {profileMessage}
            </ThemedText>
          ) : null}
        </Card>

      <Card>
        <ThemedText type="eyebrow" themeColor="brand">
          Instructions
        </ThemedText>
        {HelpFaq.map((item) => (
          <View key={item.q} style={{ gap: 4 }}>
            <ThemedText type="smallBold">{item.q}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.a}
            </ThemedText>
          </View>
        ))}
      </Card>

      <Card>
        <ThemedText type="eyebrow" themeColor="brand">
          Legal
        </ThemedText>
        <ThemedText type="smallBold">Privacy policy</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          How wishlists, share links, and surprise-safe reservations are handled.
        </ThemedText>
        <Button label="Open privacy policy" onPress={() => openPrivacyPolicy('settings')} />
      </Card>

      <Card>
        <ThemedText type="eyebrow" themeColor="brand">
          Your account
        </ThemedText>
        <ThemedText type="smallBold">Delete account</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Permanently deletes your sign-in, profile, wishlists, photos, and comments. This can’t be undone.
        </ThemedText>
        {confirmingDelete ? (
          <>
            <TextField
              label="Type DELETE to confirm"
              autoCapitalize="characters"
              autoCorrect={false}
              value={deleteText}
              onChangeText={setDeleteText}
              placeholder="DELETE"
            />
            <Button
              label={deleting ? 'Deleting…' : 'Delete account'}
              disabled={deleting || deleteText.trim().toUpperCase() !== 'DELETE'}
              onPress={() => void onDelete()}
            />
            <Button
              label="Cancel"
              variant="ghost"
              disabled={deleting}
              onPress={() => {
                setConfirmingDelete(false);
                setDeleteText('');
                setDeleteError(null);
              }}
            />
          </>
        ) : (
          <Button label="Delete account" variant="secondary" onPress={() => setConfirmingDelete(true)} />
        )}
        {deleteError ? (
          <ThemedText type="small" themeColor="textSecondary">
            {deleteError}
          </ThemedText>
        ) : null}
      </Card>

      <Card>
        <ThemedText type="small" themeColor="textSecondary">
          Version {version}
          {user?.demo ? ' · Explore demo' : ''}
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
