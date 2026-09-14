import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { WishlistProvider } from '@/context/wishlist-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'sign-in',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <SplashController />
        <ThemedRoot />
      </WishlistProvider>
    </AuthProvider>
  );
}

function SplashController() {
  const { isLoading } = useAuth();
  if (!isLoading) {
    SplashScreen.hide();
  }
  return null;
}

function ThemedRoot() {
  const colorScheme = useColorScheme();
  const theme = useTheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
        contentStyle: { backgroundColor: headerBackground },
      }}>
      <Stack.Screen name="g/[token]" options={{ title: 'Shared wishlist' }} />
      <Stack.Screen name="auth/callback" options={{ title: 'Signing in' }} />
      <Stack.Protected guard={!!user}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
