import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyIllustration } from '@/components/empty-illustration';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useWishlist } from '@/context/wishlist-context';
import { Spacing } from '@/constants/theme';
import { PrettyCopy } from '@/lib/copy';
import { openGiverShare } from '@/lib/giver-catalog';
import { track } from '@/lib/analytics';
import { shareLink } from '@/lib/env';
import { mateInviteMessage } from '@/lib/invite';
import { inviteByEmail, prefetchSharedItems } from '@/services/wishlist';

async function copyOrShare(text: string, url: string, setMessage: (value: string) => void) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    setMessage('Invite copied — paste it to mates.');
    return;
  }
  await Share.share({ message: text, url });
}

export default function ShareScreen() {
  const { wishlist, occasions, items, addOccasion } = useWishlist();
  const [email, setEmail] = useState('');
  const [occasionTitle, setOccasionTitle] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const link = wishlist ? shareLink(wishlist.share_token) : '';

  async function onInvite() {
    setMessage(null);
    try {
      const result = await inviteByEmail(email);
      if ('stub' in result && result.stub) {
        setMessage(`Invite stubbed for ${result.email}. No email was sent.`);
      } else {
        setMessage(`Invite saved for ${email}. Email delivery is not wired yet.`);
      }
      setEmail('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Invite failed');
    }
  }

  async function onCreateOccasion() {
    setBusy(true);
    setMessage(null);
    try {
      const occasion = await addOccasion(occasionTitle);
      setOccasionTitle('');
      setMessage(`Created ${occasion.title}. Share that pack so givers only see those items.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not create occasion');
    } finally {
      setBusy(false);
    }
  }

  async function sharePack(token: string, title?: string | null) {
    const packLink = shareLink(token);
    track('share_link_copied', { token, occasion: title ?? 'whole-list' });
    await copyOrShare(mateInviteMessage(packLink, title), packLink, setMessage);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: PrettyCopy.shareTitle }} />

      <Button
        label={PrettyCopy.shareWithMates}
        icon="share"
        disabled={!link}
        onPress={() => link && wishlist && void sharePack(wishlist.share_token)}
      />
      <ThemedText themeColor="textSecondary">{PrettyCopy.shareSubtitle}</ThemedText>
      {message ? (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: advanced }}
        accessibilityLabel={PrettyCopy.shareAdvanced}
        onPress={() => setAdvanced((open) => !open)}
        hitSlop={8}
        style={styles.advancedToggle}>
        <ThemedText type="smallBold" themeColor="brand">
          {PrettyCopy.shareAdvanced}
        </ThemedText>
      </Pressable>

      {advanced ? (
        <View style={styles.advanced}>
          <ThemedText type="titleSm">Share a pack</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            A link to just those gifts.
          </ThemedText>
          {occasions.length === 0 ? (
            <View style={styles.invitesEmpty}>
              <EmptyIllustration kind="invites" size={120} />
              <ThemedText type="small" themeColor="textSecondary">
                No packs yet.
              </ThemedText>
            </View>
          ) : (
            occasions.map((occasion) => {
              const count = items.filter((item) => item.occasion_id === occasion.id).length;
              const occasionLink = shareLink(occasion.share_token);
              return (
                <View key={occasion.id} style={styles.occasion}>
                  <ThemedText type="smallBold">
                    {occasion.title} · {count} item{count === 1 ? '' : 's'}
                  </ThemedText>
                  <ThemedText type="code">{occasionLink}</ThemedText>
                  <View style={styles.row}>
                    <Button
                      label={PrettyCopy.shareCta}
                      icon="share"
                      variant="secondary"
                      onPress={() => void sharePack(occasion.share_token, occasion.title)}
                    />
                    <Button
                      label="Open giver view"
                      variant="ghost"
                      onPress={() => openGiverShare(occasion.share_token, router.push, prefetchSharedItems)}
                    />
                  </View>
                </View>
              );
            })
          )}
          <TextField
            label="New occasion"
            placeholder="Christmas"
            value={occasionTitle}
            onChangeText={setOccasionTitle}
          />
          <Button label={busy ? 'Saving…' : 'Create occasion pack'} disabled={busy} onPress={() => void onCreateOccasion()} />

          <TextField
            label="Invite by email"
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="auntie@example.com"
            value={email}
            onChangeText={setEmail}
          />
          <Button label="Save invite" variant="secondary" onPress={() => void onInvite()} />

          {link ? <ThemedText type="code">{link}</ThemedText> : null}
          <Button
            label="Open giver view"
            variant="ghost"
            onPress={() => openGiverShare(wishlist?.share_token, router.push, prefetchSharedItems)}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
  },
  occasion: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
  invitesEmpty: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  advancedToggle: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
  },
  advanced: {
    gap: Spacing.three,
  },
});
