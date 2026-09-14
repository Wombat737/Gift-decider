import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import type { SessionUser } from '@/lib/types';

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

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session?.user;
      setUser(
        sessionUser
          ? { id: sessionUser.id, email: sessionUser.email ?? null, demo: false }
          : null,
      );
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user;
      setUser(
        sessionUser
          ? { id: sessionUser.id, email: sessionUser.email ?? null, demo: false }
          : null,
      );
    });

    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      async signInWithMagicLink(email: string) {
        const trimmed = email.trim();
        if (!trimmed) throw new Error('Enter your email');
        if (!supabase) {
          throw new Error('Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to send a real magic link. Use Explore demo until then.');
        }

        const { error } = await supabase.auth.signInWithOtp({
          email: trimmed,
          options: {
            emailRedirectTo: 'giftdecider://auth/callback',
          },
        });
        if (error) throw error;
        return 'Check your email for a magic link.';
      },
      signInDemo() {
        setUser(DEMO_USER);
      },
      async signOut() {
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
