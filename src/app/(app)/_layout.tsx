import { Stack } from 'expo-router';

import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="wishlist" options={{ title: 'My wishlist' }} />
      <Stack.Screen name="add" options={{ title: 'Add item' }} />
      <Stack.Screen name="paste" options={{ title: 'Paste Instagram URL' }} />
      <Stack.Screen name="share" options={{ title: 'Share & invite' }} />
      <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
    </Stack>
  );
}
