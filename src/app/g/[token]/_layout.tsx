import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function SharedListLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="index" options={{ title: 'Shared wishlist' }} />
      <Stack.Screen name="[itemId]" options={{ title: 'Gift' }} />
    </Stack>
  );
}
