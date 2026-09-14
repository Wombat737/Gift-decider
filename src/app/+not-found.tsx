import { Link, Stack } from 'expo-router';

import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Missing' }} />
      <Screen>
        <ThemedText type="heading">That page isn’t in Gift Decider.</ThemedText>
        <ThemedText themeColor="textSecondary">
          If you opened a GitHub Pages link, check the /Gift-decider prefix. Demo giver URLs are /g/demo,
          /g/demo-birthday, and /g/demo-housewarming.
        </ThemedText>
        <Link href="/">
          <ThemedText type="link" themeColor="accent">
            Back to Gift Decider
          </ThemedText>
        </Link>
      </Screen>
    </>
  );
}
