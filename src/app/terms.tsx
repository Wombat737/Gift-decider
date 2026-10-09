import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { supportEmail } from '@/lib/legal';
import { acceptTerms, getOwnProfile } from '@/services/profile';

function agreedOn(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'today';
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function TermsScreen() {
  const { user } = useAuth();
  const [acceptedAt, setAcceptedAt] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const email = supportEmail();

  useEffect(() => {
    if (!user) {
      setAcceptedAt(undefined);
      return;
    }
    let cancelled = false;
    void getOwnProfile()
      .then((profile) => {
        if (!cancelled) setAcceptedAt(profile?.terms_accepted_at);
      })
      .catch(() => {
        if (!cancelled) setAcceptedAt(undefined);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function onAgree() {
    setBusy(true);
    setError(null);
    try {
      const stamped = await acceptTerms();
      setAcceptedAt(stamped ?? new Date().toISOString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your agreement');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Terms' }} />
      <ThemedText type="heading">Terms of use</ThemedText>
      <ThemedText themeColor="textSecondary">
        Gift Decider is for planning gifts with people you know. Comments are visible only to other givers on that
        list, not to the person the list is for.
      </ThemedText>

      <Card>
        <ThemedText type="smallBold">No tolerance for objectionable content or abusive users</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Don’t post harassment, hate, sexual content, or anything meant to hurt someone. We remove that content and
          we may suspend the account behind it.
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="smallBold">Reports</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Every comment from someone else has Report. Pick a reason and add a note if you want. The comment is hidden
          for you straight away. We act on reports within 24 hours.
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="smallBold">Blocking</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          You can block another giver from their comment. Their comments stay hidden for you, and they drop out of
          your @tag list. Unblock them any time from Settings → Blocked people.
        </ThemedText>
      </Card>

      <Card>
        <ThemedText type="smallBold">Contact</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Contact: TODO ({email}). Write if a report needs a faster look, or if you want something removed.
        </ThemedText>
      </Card>

      {user && acceptedAt ? (
        <ThemedText type="small" themeColor="textSecondary">
          You agreed on {agreedOn(acceptedAt)}.
        </ThemedText>
      ) : null}
      {user && acceptedAt === null ? (
        <Button label={busy ? 'Saving…' : 'I agree to the Terms'} disabled={busy} onPress={() => void onAgree()} />
      ) : null}
      {!user ? (
        <ThemedText type="small" themeColor="textSecondary">
          Sign in, then agree here before you post a comment.
        </ThemedText>
      ) : null}
      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary" style={styles.foot}>
        Last updated 9 October 2026.
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  foot: {
    paddingBottom: Spacing.four,
  },
});
