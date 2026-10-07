import { Stack } from 'expo-router';

import { exitHeaderOptions } from '@/components/stack-exit-button';
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
          headerTitleStyle: { fontFamily: Fonts.sans, fontWeight: '600' },
          contentStyle: { backgroundColor: theme.background },
          freezeOnBlur: false,
          animation: 'slide_from_right',
          ...exitHeaderOptions(),
        }}>
        {/* No local history on the list — leave the edge swipe to the parent stack. */}
        <Stack.Screen name="index" options={{ title: 'Opening list…', gestureEnabled: false }} />
        <Stack.Screen name="[itemId]" options={{ title: 'Gift', gestureEnabled: true, fullScreenGestureEnabled: true }} />
      </Stack>
    </GiverShareProvider>
  );
}
