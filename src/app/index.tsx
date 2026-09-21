import { Redirect } from 'expo-router';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { peekPendingSharePhoto, peekPendingShareUrl } from '@/lib/share-intent';

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

  const pending = peekPendingShareUrl();
  if (pending) {
    return <Redirect href={`/add?url=${encodeURIComponent(pending)}`} />;
  }
  if (peekPendingSharePhoto()) {
    return <Redirect href="/add?photo=1" />;
  }

  return <Redirect href="/wishlist" />;
}
