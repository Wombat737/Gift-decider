import { Stack, usePathname } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FirstRun } from '@/components/first-run';
import { EditionPlusBar, EditionTopTabs } from '@/components/stage-tab-bar';
import { exitHeaderOptions } from '@/components/stack-exit-button';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PrettyCopy } from '@/lib/copy';
import { readAppPrefs } from '@/lib/preferences';
import { stageTabVisible } from '@/lib/stage-home';

export default function AppLayout() {
  const theme = useTheme();
  const pathname = usePathname();
  const [introOpen, setIntroOpen] = useState(() => !readAppPrefs().introSeen);
  const chrome = stageTabVisible(pathname);

  return (
    <View style={[styles.shell, { backgroundColor: theme.background }]}>
      {chrome ? <EditionTopTabs pathname={pathname} /> : null}
      <View style={styles.stack}>
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
        <Stack.Screen name="people" options={{ title: 'People', headerShown: false }} />
        <Stack.Screen name="requests" options={{ title: 'Requests' }} />
        <Stack.Screen name="settings" options={{ title: 'Me', headerShown: false }} />
        <Stack.Screen name="blocked" options={{ title: 'Blocked people' }} />
      </Stack>
      </View>
      {chrome ? <EditionPlusBar /> : null}
      {introOpen ? <FirstRun onDone={() => setIntroOpen(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
  stack: {
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
});
