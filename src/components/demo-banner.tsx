import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { env } from '@/lib/env';

export function DemoBanner() {
  const { user } = useAuth();
  const demo = !env.isSupabaseConfigured || user?.demo;

  if (!demo) return null;

  return (
    <ThemedView style={styles.banner}>
      <ThemedText type="small" themeColor="textSecondary">
        {user?.demo ? 'Explore demo stays on this device.' : 'Sample lists stay on this device.'}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    paddingHorizontal: 20,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
