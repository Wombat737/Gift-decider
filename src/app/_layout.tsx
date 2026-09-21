import { DefaultTheme, ThemeProvider, useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect } from 'react';
import { AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { sanitizeBuyUrl } from '@/lib/link-preview';
import { stashNativeShare } from '@/lib/read-share-payload';
import { queryValue, rememberPendingShareUrl } from '@/lib/share-intent';
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
  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <WishlistProvider>
          <InboxProvider>
            <WebFonts />
            <SplashController />
            <ThemedRoot />
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
      <ShareOpenAdd />
    </ThemeProvider>
  );
}

function ShareOpenAdd() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ url?: string; photo?: string }>();

  const routeUrl = sanitizeBuyUrl(queryValue(params.url));

  useEffect(() => {
    const browserPath =
      typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') || '/' : '';
    const browserUrl =
      typeof window !== 'undefined' ? sanitizeBuyUrl(new URLSearchParams(window.location.search).get('url')) : null;
    const onAdd = pathname === '/add' || browserPath === '/add';
    const shared = (onAdd ? routeUrl || browserUrl : null) ?? null;
    if (shared) rememberPendingShareUrl(shared);
  }, [pathname, routeUrl]);

  const open = useCallback(() => {
    if (!user) return;
    const incoming = stashNativeShare();
    if (incoming.url) {
      const current = sanitizeBuyUrl(queryValue(params.url));
      if (pathname === '/add' && current === incoming.url) return;
      router.replace({ pathname: '/add', params: { url: incoming.url } });
      return;
    }
    if (incoming.photo) {
      if (pathname === '/add' && queryValue(params.photo) === '1') return;
      router.replace({ pathname: '/add', params: { photo: '1' } });
    }
  }, [params.photo, params.url, pathname, router, user]);

  useEffect(() => {
    if (isLoading || !user) return;
    open();
    const retry = setTimeout(open, 0);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') open();
    });
    return () => {
      clearTimeout(retry);
      sub.remove();
    };
  }, [isLoading, open, user]);

  return null;
}

function RootNavigator({
  headerBackground,
  headerTint,
}: {
  headerBackground: string;
  headerTint: string;
}) {
  const { user, isLoading } = useAuth();

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
      {/* Keep Add mounted while the session resolves. Guarding on `!!user` during
          the first paint bounces a cold start (share sheet, /add?url=) to the wishlist. */}
      <Stack.Protected guard={isLoading || !!user}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!isLoading && !user}>
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
