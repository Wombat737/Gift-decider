import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { LegalLinks } from '@/components/legal-links';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { env } from '@/lib/env';

export default function SignInScreen() {
  const { signInWithMagicLink, signInDemo, signInWithApple, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const live = env.isSupabaseConfigured;

  async function onMagicLink() {
    setBusy(true);
    setMessage(null);
    try {
      const next = await signInWithMagicLink(email);
      setMessage(next);
      track('magic_link_requested');
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

  function onExploreDemo() {
    track('demo_explore');
    signInDemo();
    router.replace('/wishlist');
  }

  const magicLinkFields = (
    <>
      <TextField
        label="Email"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        hint={
          live
            ? 'Sends a Supabase magic link. Add the redirect URL from README to Authentication → URL Configuration.'
            : 'Magic link needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. Explore demo works without them.'
        }
      />
      <Button
        label={busy ? 'Sending…' : 'Email me a magic link'}
        variant={live ? 'primary' : 'secondary'}
        disabled={busy}
        onPress={() => void onMagicLink()}
      />
    </>
  );

  const demoCard = (
    <Card>
      <ThemedText type="smallBold">{live ? 'Or explore the sample list' : 'Show mates the demo'}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {live
          ? 'Sample birthday and housewarming packs stay on this device. GitHub Pages uses this path when env vars are empty.'
          : 'No install. Sample birthday and housewarming packs, surprise-safe owner screens, giver locks and chip-ins. Best on a phone browser.'}
      </ThemedText>
      <Button
        label="Explore demo"
        accessibilityLabel="explore-demo"
        variant={live ? 'secondary' : 'primary'}
        onPress={onExploreDemo}
      />
    </Card>
  );

  return (
    <Screen>
      <View style={styles.hero}>
        <BrandMark size={56} />
        <ThemedText type="eyebrow" themeColor="brand">
          Gift Decider
        </ThemedText>
        <ThemedText type="title">Pick gifts from a living photo wishlist.</ThemedText>
        <ThemedText themeColor="textSecondary">
          {live
            ? 'Sign in with email to use your live wishlist. Recipients pin photos; givers open a share link — they won’t spoil the surprise.'
            : 'Recipients pin photos and vibes. Givers open a read-only link — reserve, chip in, shop AU. They won’t see what you chose.'}
        </ThemedText>
      </View>

      {live ? (
        <Card>
          <ThemedText type="smallBold">Live wishlist</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Magic link against your Supabase project. Profile and lists persist. Explore demo is still available
            without mixing into that project.
          </ThemedText>
          {magicLinkFields}
        </Card>
      ) : (
        demoCard
      )}

      {live ? demoCard : magicLinkFields}

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

      <LegalLinks />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: Spacing.two,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.two,
  },
  oauth: {
    gap: Spacing.one,
  },
});
