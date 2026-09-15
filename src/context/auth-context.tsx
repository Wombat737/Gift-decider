import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

import { completeAuthFromUrl } from '@/lib/auth-redirect';
import { isDemoSession, writeDemoSession } from '@/lib/demo-session';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { SessionUser } from '@/lib/types';

if (Platform.OS === 'web') {
  WebBrowser.maybeCompleteAuthSession();
}

type AuthContextValue = {
  user: SessionUser | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<string>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const DEMO_USER: SessionUser = {
  id: 'demo-user',
  email: 'you@giftdecider.local',
  demo: true,
};

function sessionUserFrom(id: string, email: string | null): SessionUser {
  return { id, email, demo: false };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setUser(isDemoSession() ? DEMO_USER : null);
      setIsLoading(false);
      return;
    }

    const applySessionUser = (id: string | undefined, email: string | null | undefined) => {
      if (id) {
        writeDemoSession(false);
        setUser(sessionUserFrom(id, email ?? null));
        return;
      }
      if (isDemoSession()) {
        setUser(DEMO_USER);
        return;
      }
      setUser(null);
    };

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      applySessionUser(sessionUser?.id, sessionUser?.email);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      applySessionUser(sessionUser?.id, sessionUser?.email);
    });

    let linkingSub: { remove: () => void } | undefined;
    if (Platform.OS !== 'web') {
      const consume = (url: string | null) => {
        if (!url || !supabase) return;
        void completeAuthFromUrl(url, supabase).catch(() => {
          // Ignore unrelated deep links; callback screen shows errors if needed.
        });
      };
      void Linking.getInitialURL().then(consume);
      linkingSub = Linking.addEventListener('url', ({ url }) => consume(url));
    }

    return () => {
      data.subscription.unsubscribe();
      linkingSub?.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async signInWithMagicLink(email: string) {
        const trimmed = email.trim();
        if (!trimmed) throw new Error('Enter your email');
        if (!supabase) {
          throw new Error(
            'Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to send a real magic link. Use Explore demo until then.',
          );
        }

        const redirectTo = Linking.createURL('auth/callback');
        const { error } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: redirectTo,
          },
        });
        if (error) throw error;
        return `Check ${trimmed} for a magic link. It returns to ${redirectTo}`;
      },
      signInDemo() {
        writeDemoSession(true);
        setUser(DEMO_USER);
      },
      async signOut() {
        writeDemoSession(false);
        if (supabase && !user?.demo) {
          await supabase.auth.signOut();
        }
        setUser(null);
      },
      async signInWithApple() {
        if (!env.appleAuthEnabled) {
          throw new Error('Sign in with Apple is a placeholder. See README → Apple / Google.');
        }
        throw new Error('Apple Sign-In is not wired in this scaffold.');
      },
      async signInWithGoogle() {
        if (!env.googleAuthEnabled) {
          throw new Error('Sign in with Google is a placeholder. See README → Apple / Google.');
        }
        throw new Error('Google Sign-In is not wired in this scaffold.');
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = use(AuthContext);
  if (!value) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return value;
}
