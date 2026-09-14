import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { env } from '@/lib/env';

export function DemoBanner() {
  const { user } = useAuth();
  const demo = !env.isSupabaseConfigured || user?.demo;

  if (!demo) return null;

  return (
    <ThemedView type="backgroundElement" style={styles.banner}>
      <ThemedText type="smallBold">Demo mode</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {env.isSupabaseConfigured
          ? 'Signed in locally — data stays on this device.'
          : 'Supabase env is empty. Screens use sample data so you can click around — including funded reveal and dead-link heal.'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    gap: 2,
  },
});
