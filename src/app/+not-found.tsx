import { Link, Stack } from 'expo-router';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Missing' }} />
      <Screen>
        <ThemedText type="heading">That screen is not in the scaffold.</ThemedText>
        <Link href="/">
          <ThemedText type="link" themeColor="accent">
            Back to Gift Decider
          </ThemedText>
        </Link>
      </Screen>
    </>
  );
}
