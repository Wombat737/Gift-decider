import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

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
import { reviewSignInEmail } from '@/lib/review-sign-in';

export default function SignInScreen() {
  const { signInWithMagicLink, signInWithPassword, signInDemo } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const live = env.isSupabaseConfigured;
  const reviewEmail = reviewSignInEmail(email);

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

  async function onPassword() {
    setBusy(true);
    setMessage(null);
    try {
      await signInWithPassword(email, password);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  }

  function onEmailChange(next: string) {
    setEmail(next);
    if (!reviewSignInEmail(next)) setPassword('');
  }

  function onExploreDemo() {
    track('demo_explore');
    signInDemo();
    router.replace('/wishlist');
  }

  return (
    <Screen>
      <HeroWash variant="hero" style={styles.hero}>
        <BrandMark size={56} />
        <ThemedText type="eyebrow" themeColor="brand">
          Meantvo
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
            onChangeText={onEmailChange}
            hint={
              reviewEmail ? undefined : 'We’ll email you a one-time sign-in link. It expires soon.'
            }
          />
          {reviewEmail ? (
            <TextField
              label="Password"
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              secureTextEntry
              textContentType="password"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
            />
          ) : null}
          <Button
            label={reviewEmail ? (busy ? 'Signing in…' : 'Sign in') : busy ? 'Sending…' : 'Email me a magic link'}
            disabled={busy}
            onPress={() => void (reviewEmail ? onPassword() : onMagicLink())}
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
            onChangeText={onEmailChange}
            hint={
              reviewEmail
                ? undefined
                : 'We’ll email you a one-time sign-in link. Explore the demo if email sign-in isn’t available.'
            }
          />
          {reviewEmail ? (
            <TextField
              label="Password"
              autoCapitalize="none"
              autoComplete="current-password"
              autoCorrect={false}
              secureTextEntry
              textContentType="password"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
            />
          ) : null}
          <Button
            label={reviewEmail ? (busy ? 'Signing in…' : 'Sign in') : busy ? 'Sending…' : 'Email me a magic link'}
            variant="secondary"
            disabled={busy}
            onPress={() => void (reviewEmail ? onPassword() : onMagicLink())}
          />
        </>
      )}

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
});
