import { router } from 'expo-router';
import { useEffect } from 'react';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';

export default function AuthCallbackScreen() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.replace('/wishlist');
    }
  }, [isLoading, user]);

  return (
    <Screen>
      <ThemedText type="heading">Signing you in…</ThemedText>
      <ThemedText themeColor="textSecondary">
        Magic-link landing stub. Supabase should persist the session, then this screen sends you to your wishlist.
      </ThemedText>
    </Screen>
  );
}
