import { router, Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { FlowHeader } from '@/components/flow-header';
import { Screen } from '@/components/screen';
import { StatusChip } from '@/components/status-chip';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { PrettyCopy } from '@/lib/copy';
import { giverAccessChip, shareTokenFromInput } from '@/lib/giver-social';
import type { GiverPerson, HandleSearchHit } from '@/lib/types';
import {
  inviteGiverByEmail,
  listGiverPeople,
  requestGiverAccess,
  searchProfilesByHandle,
  unlistGiverPerson,
} from '@/services/giver-social';

export default function PeopleScreen() {
  const [people, setPeople] = useState<GiverPerson[]>([]);
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [hits, setHits] = useState<HandleSearchHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setPeople(await listGiverPeople());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load people');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function onSearch() {
    setBusy(true);
    setMessage(null);
    try {
      const next = await searchProfilesByHandle(handle);
      setHits(next);
      if (next.length === 0) {
        setMessage('No handle matched. Private lists stay off search — try a share link.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setBusy(false);
    }
  }

  async function onRequest(recipientId: string) {
    setBusy(true);
    setMessage(null);
    try {
      const result = await requestGiverAccess(recipientId);
      await refresh();
      if (result.share_token) {
        setMessage('They’re on your people list — open their gifts.');
      } else {
        setMessage('Pinned. Waiting for them to accept before you can open the list.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not request access');
    } finally {
      setBusy(false);
    }
  }

  async function onInvite() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await inviteGiverByEmail(email);
      setEmail('');
      await refresh();
      if ('kind' in result && result.kind === 'stub') {
        setMessage(`Invite stubbed for ${result.email}. No email was sent.`);
      } else {
        setMessage('Requested — waiting for them to accept, or they can share a link back.');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not invite');
    } finally {
      setBusy(false);
    }
  }

  function onPasteLink() {
    const token = shareTokenFromInput(link);
    if (!token) {
      setMessage('Paste a /g/… share link, or the token itself.');
      return;
    }
    router.push(`/g/${token}`);
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'People' }} />
      <FlowHeader role="giver" title={PrettyCopy.peopleTitle} subtitle={PrettyCopy.peopleEmptyBody} />

      <Card>
        <ThemedText type="eyebrow" themeColor="brand">
          Add someone
        </ThemedText>
        <TextField
          label="Paste a share link"
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          placeholder="https://…/g/token"
        />
        <Button label="Open link" variant="secondary" onPress={onPasteLink} />
        <TextField
          label="Search handle"
          value={handle}
          onChangeText={setHandle}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="@mumhandle"
          hint="Exact or prefix on their handle. Display names are not searchable."
        />
        <Button label={busy ? 'Searching…' : 'Search'} disabled={busy} onPress={() => void onSearch()} />
        {hits.map((hit) => (
          <View key={hit.id} style={styles.hit}>
            <ThemedText type="smallBold">@{hit.handle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {hit.display_name}
            </ThemedText>
            <StatusChip label={giverAccessChip(hit.access_status).label} tone={giverAccessChip(hit.access_status).tone} />
            {hit.can_open && hit.share_token ? (
              <Button label="Open list" onPress={() => router.push(`/g/${hit.share_token}`)} />
            ) : (
              <Button
                label="Request access"
                variant="secondary"
                disabled={busy || hit.access_status === 'pending_request'}
                onPress={() => void onRequest(hit.id)}
              />
            )}
          </View>
        ))}
        <TextField
          label="Invite by email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="mum@example.com"
          hint="Authenticated sender only. Scaffold does not send mail yet."
        />
        <Button label="Send invite" variant="ghost" disabled={busy} onPress={() => void onInvite()} />
        {message ? (
          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
        ) : null}
      </Card>

      {people.length === 0 ? (
        <EmptyState
          kind="invites"
          title={PrettyCopy.peopleEmptyTitle}
          body={PrettyCopy.peopleEmptyBody}
        />
      ) : (
        people.map((person) => {
          const chip = giverAccessChip(person.access_status);
          return (
            <Card key={person.id}>
              <ThemedText type="titleSm">{person.label || person.display_name || `@${person.handle}`}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {person.handle ? `@${person.handle}` : 'No handle yet'}
              </ThemedText>
              <StatusChip label={chip.label} tone={chip.tone} />
              {person.can_open && person.share_token ? (
                <Button label="Open wishlist" onPress={() => router.push(`/g/${person.share_token}`)} />
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Waiting for them to accept. You can still keep this pin.
                </ThemedText>
              )}
              <Button
                label="Remove pin"
                variant="ghost"
                onPress={() => {
                  void unlistGiverPerson(person.id).then(() => refresh());
                }}
              />
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hit: {
    gap: Spacing.one,
    width: '100%',
  },
});
