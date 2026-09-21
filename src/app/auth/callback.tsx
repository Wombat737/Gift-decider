import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { completeAuthFromUrl } from '@/lib/auth-redirect';
import { hasPendingShare } from '@/lib/share-intent';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackScreen() {
  const { user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!supabase) return;

    let cancelled = false;
    void (async () => {
      const url = await Linking.getInitialURL();
      if (!url || cancelled) return;
      try {
        await completeAuthFromUrl(url, supabase);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not complete sign-in');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && user && !hasPendingShare()) {
      router.replace('/wishlist');
    }
  }, [isLoading, user]);

  return (
    <Screen>
      <ThemedText type="heading">{error ? 'Sign-in did not finish' : 'Signing you in…'}</ThemedText>
      <ThemedText themeColor="textSecondary">
        {error
          ? error
          : 'Completing the magic link. You will land on your wishlist when the session is ready.'}
      </ThemedText>
    </Screen>
  );
}
