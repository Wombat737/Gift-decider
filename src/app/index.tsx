import { Redirect } from 'expo-router';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Screen>
        <ThemedText themeColor="textSecondary">Loading…</ThemedText>
      </Screen>
    );
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return <Redirect href="/wishlist" />;
}
