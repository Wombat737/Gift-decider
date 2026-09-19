import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { FlairIcon } from '@/components/flair-icons';
import { FlowHeader } from '@/components/flow-header';
import { InboxBanner } from '@/components/inbox-banner';
import { Screen } from '@/components/screen';
import { StatusChip } from '@/components/status-chip';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useInbox } from '@/context/inbox-context';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { usesDemoData } from '@/lib/app-mode';
import { PrettyCopy } from '@/lib/copy';
import { acceptDemoOutgoingRequest } from '@/lib/demo-social';
import { classifyPeopleSearchQuery, giverAccessChip } from '@/lib/giver-social';
import { acceptBannerText, isNewlyReadyPin } from '@/lib/inbox';
import type { GiverPerson, HandleSearchHit } from '@/lib/types';
import {
  inviteGiverByEmail,
  listGiverPeople,
  lookupProfileByEmail,
  requestGiverAccess,
  searchProfilesByHandle,
  unlistGiverPerson,
} from '@/services/giver-social';

function wantsAddParam(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === '1' || raw === 'true';
}

export default function PeopleScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ add?: string | string[] }>();
  const { newlyReady, refreshInbox, ackReady } = useInbox();
  const [people, setPeople] = useState<GiverPerson[]>([]);
  const [addingOverride, setAddingOverride] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [email, setEmail] = useState('');
  const [hits, setHits] = useState<HandleSearchHit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const adding = addingOverride ?? wantsAddParam(params.add);
  const readyCopy = acceptBannerText(newlyReady);

  const refresh = useCallback(async () => {
    try {
      setPeople(await listGiverPeople());
      await refreshInbox();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load people');
    }
  }, [refreshInbox]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        ackReady();
      };
    }, [ackReady, refresh]),
  );

  function openAdd() {
    setAddingOverride(true);
    setMessage(null);
  }

  function closeAdd() {
    setAddingOverride(false);
  }

  async function onSearch() {
    setBusy(true);
    setMessage(null);
    try {
      const kind = classifyPeopleSearchQuery(query);
      const next =
        kind === 'email' ? await lookupProfileByEmail(query) : await searchProfilesByHandle(query);
      setHits(next);
      if (next.length === 0) {
        setMessage(
          kind === 'email'
            ? 'No account matched that email. Invite them below if they’re new.'
            : 'No handle matched. Private lists stay off search — invite by email below if they’re new.',
        );
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

  const addForm = (
    <Card>
      <ThemedText type="eyebrow" themeColor="brand">
        {PrettyCopy.peopleCta}
      </ThemedText>
      <TextField
        label="Handle or email"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
        keyboardType="email-address"
        placeholder="@mumhandle or mum@example.com"
        hint="Exact or prefix on their handle, or their email. Display names are not searchable."
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
        hint="For someone who isn’t on Gift Decider yet. Authenticated sender only — scaffold does not send mail yet."
      />
      <Button label="Send invite" variant="ghost" disabled={busy} onPress={() => void onInvite()} />
      {message ? (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      ) : null}
      <Button label="Not now" variant="ghost" onPress={closeAdd} />
    </Card>
  );

  return (
    <Screen
      footer={
        !adding && people.length > 0 ? (
          <Button nativePress icon="add" label={PrettyCopy.peopleCta} onPress={openAdd} />
        ) : undefined
      }>
      <Stack.Screen
        options={{
          title: 'People',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={PrettyCopy.peopleCta}
              hitSlop={12}
              onPress={openAdd}
              style={[styles.headerAdd, { backgroundColor: theme.brand }]}>
              <FlairIcon name="add" color={theme.brandText} />
            </Pressable>
          ),
        }}
      />
      <FlowHeader role="giver" title={PrettyCopy.peopleTitle} subtitle={PrettyCopy.peopleEmptyBody} />

      {adding ? addForm : null}

      {readyCopy ? (
        <InboxBanner title="They’re ready" body={readyCopy} accessibilityLabel="accepted-giver-pins" />
      ) : null}

      {people.length === 0 ? (
        adding ? null : (
          <EmptyState
            kind="invites"
            title={PrettyCopy.peopleEmptyTitle}
            body={PrettyCopy.peopleEmptyBody}
            actionLabel={PrettyCopy.peopleCta}
            actionIcon="add"
            onAction={openAdd}
          />
        )
      ) : (
        people.map((person) => {
          const chip = giverAccessChip(person.access_status);
          const justReady = isNewlyReadyPin(person.id, newlyReady);
          return (
            <Card key={person.id} selected={justReady}>
              <ThemedText type="titleSm">{person.label || person.display_name || `@${person.handle}`}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {person.handle ? `@${person.handle}` : 'No handle yet'}
              </ThemedText>
              <StatusChip label={justReady ? 'Ready' : chip.label} tone={justReady ? 'brand' : chip.tone} />
              {person.can_open && person.share_token ? (
                <Button label="Open wishlist" onPress={() => router.push(`/g/${person.share_token}`)} />
              ) : person.access_status === 'active' ? (
                <ThemedText type="small" themeColor="textSecondary">
                  They’re ready — ask them for a share link if Open isn’t here yet.
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Waiting for them to accept. You can still keep this pin.
                </ThemedText>
              )}
              {usesDemoData() && person.access_status === 'pending_request' ? (
                <Button
                  label="They accepted (demo)"
                  variant="ghost"
                  onPress={() => {
                    acceptDemoOutgoingRequest(person.recipient_id);
                    void refresh();
                  }}
                />
              ) : null}
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
  headerAdd: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.one,
  },
});
