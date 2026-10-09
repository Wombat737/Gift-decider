import { Stack, usePathname } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { StageTabBar } from '@/components/stage-tab-bar';
import { exitHeaderOptions } from '@/components/stack-exit-button';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PrettyCopy } from '@/lib/copy';
import { stageTabVisible } from '@/lib/stage-home';

export default function AppLayout() {
  const theme = useTheme();
  const pathname = usePathname();

  return (
    <View style={styles.shell}>
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerTitleStyle: { fontFamily: Fonts.sans, fontWeight: '600' },
          contentStyle: { backgroundColor: theme.background },
          ...exitHeaderOptions(),
        }}>
        <Stack.Screen name="wishlist" options={{ title: PrettyCopy.ownerHomeTitle, headerShown: false }} />
        <Stack.Screen name="add" options={{ title: 'Add a pick' }} />
        <Stack.Screen name="paste" options={{ title: 'Paste Instagram URL' }} />
        <Stack.Screen name="share" options={{ title: PrettyCopy.shareTitle }} />
        <Stack.Screen name="item/[id]" options={{ title: 'Pick' }} />
        <Stack.Screen name="people" options={{ title: 'People' }} />
        <Stack.Screen name="requests" options={{ title: 'Requests' }} />
        <Stack.Screen name="settings" options={{ title: 'Me' }} />
        <Stack.Screen name="blocked" options={{ title: 'Blocked people' }} />
      </Stack>
      {stageTabVisible(pathname) ? <StageTabBar pathname={pathname} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
});
