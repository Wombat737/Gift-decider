import { Stack } from 'expo-router';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export default function AppLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerTitleStyle: { fontFamily: Fonts.sans, fontWeight: '700' },
        contentStyle: { backgroundColor: theme.background },
      }}>
      <Stack.Screen name="wishlist" options={{ title: 'My wishlist' }} />
      <Stack.Screen name="add" options={{ title: 'Add item' }} />
      <Stack.Screen name="paste" options={{ title: 'Paste Instagram URL' }} />
      <Stack.Screen name="share" options={{ title: 'Share & occasions' }} />
      <Stack.Screen name="item/[id]" options={{ title: 'Item' }} />
      <Stack.Screen name="people" options={{ title: 'People' }} />
      <Stack.Screen name="requests" options={{ title: 'Requests' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
