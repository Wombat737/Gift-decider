import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { Button } from '@/components/button';
import { HeroWash } from '@/components/hero-wash';
import { LegalLinks } from '@/components/legal-links';
import { Screen } from '@/components/screen';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { Spacing } from '@/constants/theme';
import { track } from '@/lib/analytics';
import { PrettyCopy } from '@/lib/copy';
import { env } from '@/lib/env';
import { hasPendingShare } from '@/lib/share-intent';

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
    if (!hasPendingShare()) router.replace('/wishlist');
  }

  return (
    <Screen>
      <HeroWash variant="hero" style={styles.hero}>
        <BrandMark size={56} />
        <ThemedText type="eyebrow" themeColor="brand">
          Gift Decider
        </ThemedText>
        <ThemedText type="title">{PrettyCopy.splash}</ThemedText>
        <ThemedText themeColor="textSecondary">{PrettyCopy.signInSub}</ThemedText>
      </HeroWash>

      {live ? (
        <>
          <TextField
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            hint="Sends a Supabase magic link. Add the redirect URL from README to Authentication → URL Configuration."
          />
          <Button
            label={busy ? 'Sending…' : 'Email me a magic link'}
            disabled={busy}
            onPress={() => void onMagicLink()}
          />
          <Button
            label="Explore demo"
            accessibilityLabel="explore-demo"
            variant="ghost"
            onPress={onExploreDemo}
          />
        </>
      ) : (
        <>
          <Button
            label="Explore demo"
            accessibilityLabel="explore-demo"
            onPress={onExploreDemo}
          />
          <TextField
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            hint="Magic link needs EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. Explore demo works without them."
          />
          <Button
            label={busy ? 'Sending…' : 'Email me a magic link'}
            variant="secondary"
            disabled={busy}
            onPress={() => void onMagicLink()}
          />
        </>
      )}

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
    alignItems: 'flex-start',
  },
  oauth: {
    gap: Spacing.one,
  },
});
