import { Stack } from 'expo-router';

import { GiverShareProvider } from '@/context/giver-share-context';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function SharedListLayout() {
  const theme = useTheme();

  return (
    <GiverShareProvider>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: Fonts.sans, fontWeight: '700' },
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="index" options={{ title: 'Pick a gift' }} />
        <Stack.Screen name="[itemId]" options={{ title: 'Gift' }} />
      </Stack>
    </GiverShareProvider>
  );
}
