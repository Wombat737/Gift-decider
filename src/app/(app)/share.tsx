import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useWishlist } from '@/context/wishlist-context';
import { Radius, Spacing } from '@/constants/theme';
import { shareLink } from '@/lib/env';
import { inviteByEmail } from '@/services/wishlist';

async function copyOrShareLink(link: string, setMessage: (value: string) => void) {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
    await navigator.clipboard.writeText(link);
    setMessage('Link copied.');
    return;
  }
  await Share.share({ message: `Pick a gift from my wishlist: ${link}`, url: link });
}

export default function ShareScreen() {
  const { wishlist, occasions, items, addOccasion } = useWishlist();
  const [email, setEmail] = useState('');
  const [occasionTitle, setOccasionTitle] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  return (
    <Screen>
      <ThemedText themeColor="textSecondary">
        Whole-list or occasion packs. Friends open a read-only link. You won’t see what they reserved, pledged, or bought.
      </ThemedText>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Whole wishlist</ThemedText>
        <ThemedText type="code">{link || 'Loading…'}</ThemedText>
        <View style={styles.row}>
          <Button label="Copy / share link" onPress={() => link && void copyOrShareLink(link, setMessage)} />
          <Button
            label="Open giver view"
            variant="secondary"
            onPress={() => wishlist?.share_token && router.push(`/g/${wishlist.share_token}`)}
          />
        </View>
      </ThemedView>

      <ThemedView type="backgroundElement" style={styles.card}>
        <ThemedText type="smallBold">Occasion packs</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Birthday, Christmas, housewarming — each pack gets its own giver link.
        </ThemedText>
        {occasions.length === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            No packs yet.
          </ThemedText>
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
                  <Button label="Copy pack link" variant="secondary" onPress={() => void copyOrShareLink(occasionLink, setMessage)} />
                  <Button
                    label="Open giver view"
                    variant="ghost"
                    onPress={() => router.push(`/g/${occasion.share_token}`)}
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
      </ThemedView>

      <TextField
        label="Invite by email"
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="auntie@example.com"
        value={email}
        onChangeText={setEmail}
        hint="Writes a wishlist_members row when Supabase is configured. No email provider in this scaffold."
      />
      <Button label="Save invite" variant="secondary" onPress={() => void onInvite()} />

      {message ? (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    gap: Spacing.two,
  },
  occasion: {
    gap: Spacing.one,
    paddingTop: Spacing.two,
  },
});
