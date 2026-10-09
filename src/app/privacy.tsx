import { Stack } from 'expo-router';

import { PrivacyPolicyView } from '@/components/privacy-policy-view';
import { Screen } from '@/components/screen';

export default function PrivacyScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Privacy' }} />
      <PrivacyPolicyView />
    </Screen>
  );
}
