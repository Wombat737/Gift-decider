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
    <ThemedView type="accentMuted" style={styles.banner}>
      <ThemedText type="eyebrow" themeColor="accent">
        Demo for mates
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {env.isSupabaseConfigured
          ? 'Signed in locally — data stays on this device. Owner screens stay unspoiled.'
          : 'No Supabase needed. Owner screens never show who reserved or chipped in until a group gift is funded.'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    gap: Spacing.one,
  },
});
