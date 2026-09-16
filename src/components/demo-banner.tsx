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
    <ThemedView type="brandSoft" style={styles.banner}>
      <ThemedText type="eyebrow" themeColor="brand">
        Demo for mates
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {env.isSupabaseConfigured
          ? 'Explore demo on this device — it does not write to your live Supabase project. Owner screens stay unspoiled.'
          : 'No Supabase needed. Owner screens never show who reserved or chipped in until the group-gift reveal date.'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    borderRadius: Radius.card,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    gap: Spacing.one,
  },
});
