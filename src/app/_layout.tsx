import { DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/context/auth-context';
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
  return (
    <AuthProvider>
      <WishlistProvider>
        <WebFonts />
        <SplashController />
        <ThemedRoot />
      </WishlistProvider>
    </AuthProvider>
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
        headerTitleStyle: { fontFamily: Fonts.sans, fontWeight: '700' },
        contentStyle: { backgroundColor: headerBackground },
      }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="privacy" options={{ title: 'Privacy' }} />
      <Stack.Screen name="g/[token]" options={{ headerShown: false, title: 'Shared wishlist' }} />
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
