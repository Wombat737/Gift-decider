import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { BlockedGiver } from '@/lib/types';
import { listBlockedGivers, unblockGiver } from '@/services/giver-social';

function personLabel(person: BlockedGiver) {
  return person.display_name || (person.handle ? `@${person.handle}` : 'A giver');
}

export default function BlockedPeopleScreen() {
  const [people, setPeople] = useState<BlockedGiver[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    let cancelled = false;
    void listBlockedGivers()
      .then((rows) => {
        if (!cancelled) {
          setPeople(rows);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load blocked people');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useFocusEffect(load);

  async function onUnblock(person: BlockedGiver) {
    setBusyId(person.id);
    setError(null);
    try {
      await unblockGiver(person.id);
      setPeople((current) => current.filter((row) => row.id !== person.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not unblock');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Blocked people' }} />
      <ThemedText type="heading">Blocked people</ThemedText>
      <ThemedText themeColor="textSecondary">
        Their comments stay hidden for you. Unblock someone to see them again and to @tag them.
      </ThemedText>
      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}
      {people.length === 0 && !error ? (
        <Card>
          <ThemedText type="small" themeColor="textSecondary">
            You haven’t blocked anyone. Block someone from their comment.
          </ThemedText>
        </Card>
      ) : null}
      {people.map((person) => (
        <Card key={person.id}>
          <View style={styles.row}>
            <View style={styles.name}>
              <ThemedText type="smallBold">{personLabel(person)}</ThemedText>
              {person.handle ? (
                <ThemedText type="small" themeColor="textSecondary">
                  @{person.handle}
                </ThemedText>
              ) : null}
            </View>
            <Button
              label={busyId === person.id ? 'Unblocking…' : 'Unblock'}
              variant="secondary"
              disabled={busyId != null}
              onPress={() => void onUnblock(person)}
            />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
  },
  name: {
    gap: Spacing.one,
    maxWidth: '100%',
  },
});
