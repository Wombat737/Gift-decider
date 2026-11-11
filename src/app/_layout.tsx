import {
  InstrumentSerif_400Regular,
  InstrumentSerif_400Regular_Italic,
} from '@expo-google-fonts/instrument-serif';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { InboxProvider } from '@/context/inbox-context';
import { WishlistProvider } from '@/context/wishlist-context';
import { WebFonts } from '@/components/web-fonts';
import { Colors, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

try {
  SplashScreen.preventAutoHideAsync();
} catch {
  // Web / static export has no native splash screen.
}

export const unstable_settings = {
  initialRouteName: 'index',
};

export default function RootLayout() {
  const [fontsReady, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    InstrumentSerif_400Regular,
    InstrumentSerif_400Regular_Italic,
  });

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <WishlistProvider>
          <InboxProvider>
            <WebFonts />
            <SplashController />
            {fontsReady || fontError ? <ThemedRoot /> : <View style={styles.root} />}
          </InboxProvider>
        </WishlistProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

function SplashController() {
  const { isLoading } = useAuth();
  if (!isLoading) {
    try {
      SplashScreen.hide();
    } catch {
      // ignore
    }
  }
  return null;
}

function ThemedRoot() {
  const theme = useTheme();
  const navigationTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: Colors.light.brand,
      background: Colors.light.background,
      card: Colors.light.background,
      text: Colors.light.text,
      border: Colors.light.border,
      notification: Colors.light.accent,
    },
  };

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="dark" />
      <RootNavigator headerBackground={theme.background} headerTint={theme.text} />
    </ThemeProvider>
  );
}

function RootNavigator({
  headerBackground,
  headerTint,
}: {
  headerBackground: string;
  headerTint: string;
}) {
  const { user } = useAuth();

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: headerBackground },
        headerTintColor: headerTint,
        headerTitleStyle: { fontFamily: Fonts.sans, fontWeight: '600' },
        contentStyle: { backgroundColor: headerBackground },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="terms" options={{ title: 'Terms' }} />
      <Stack.Screen
        name="g/[token]"
        options={{
          headerShown: false,
          title: 'Giver view',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      <Stack.Screen name="auth/callback" options={{ title: 'Signing in' }} />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    maxWidth: '100%',
  },
});
