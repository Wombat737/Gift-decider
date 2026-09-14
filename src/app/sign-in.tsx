import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { env } from '@/lib/env';
import { Spacing } from '@/constants/theme';

export default function SignInScreen() {
  const { signInWithMagicLink, signInDemo, signInWithApple, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onMagicLink() {
    setBusy(true);
    setMessage(null);
    try {
      const next = await signInWithMagicLink(email);
      setMessage(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send magic link');
    } finally {
      setBusy(false);
    }
  }

  async function onPlaceholder(action: () => Promise<void>) {
    setMessage(null);
    try {
      await action();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Not available yet');
    }
  }

  return (
    <Screen>
      <View style={styles.hero}>
        <ThemedText type="smallBold" themeColor="accent">
          Gift Decider
        </ThemedText>
        <ThemedText type="title">Pick gifts from a living photo wishlist.</ThemedText>
        <ThemedText themeColor="textSecondary">
          Recipients pin photos and vibes. Givers open a read-only link — reserve, chip in, shop AU. You won’t see what they chose.
        </ThemedText>
      </View>

      <TextField
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        hint={
          env.isSupabaseConfigured
            ? 'Sends a Supabase magic link. Add giftdecider://auth/callback to Redirect URLs.'
            : 'Magic link needs Supabase env vars. Explore demo works without them.'
        }
      />

      <Button label={busy ? 'Sending…' : 'Email me a magic link'} disabled={busy} onPress={() => void onMagicLink()} />

      <Button
        label="Explore demo"
        variant="secondary"
        onPress={() => {
          signInDemo();
          router.replace('/wishlist');
        }}
      />

      <View style={styles.oauth}>
        <Button
          label={env.appleAuthEnabled ? 'Sign in with Apple' : 'Sign in with Apple (soon)'}
          variant="ghost"
          onPress={() => void onPlaceholder(signInWithApple)}
        />
        <Button
          label={env.googleAuthEnabled ? 'Sign in with Google' : 'Sign in with Google (soon)'}
          variant="ghost"
          onPress={() => void onPlaceholder(signInWithGoogle)}
        />
      </View>

      {message ? (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.two,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
  },
  oauth: {
    gap: Spacing.one,
  },
});
