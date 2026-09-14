import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useMemo, useState } from 'react';

import { Button } from '@/components/button';
import { FilterChips } from '@/components/vibe-chips';
import { ItemCard } from '@/components/item-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { useWishlist } from '@/context/wishlist-context';
import { Spacing } from '@/constants/theme';

export default function WishlistGridScreen() {
  const { user, signOut } = useAuth();
  const { items, occasions, loading, error } = useWishlist();
  const [occasionId, setOccasionId] = useState('all');

  const visible = useMemo(() => {
    if (occasionId === 'all') return items;
    if (occasionId === 'none') return items.filter((item) => !item.occasion_id);
    return items.filter((item) => item.occasion_id === occasionId);
  }, [items, occasionId]);

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="heading">What you actually want</ThemedText>
        <ThemedText themeColor="textSecondary">
          Photo-first list for {user?.email ?? 'you'}. Friends pick from a share link — you won’t see reserves, pledges, or who bought what.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button label="Add item" onPress={() => router.push('/add')} />
        <Button label="Paste Instagram URL" variant="secondary" onPress={() => router.push('/paste')} />
        <Button label="Share / occasions" variant="ghost" onPress={() => router.push('/share')} />
      </View>

      {occasions.length > 0 ? (
        <FilterChips
          options={[
            { id: 'all', label: 'All' },
            ...occasions.map((row) => ({ id: row.id, label: row.title })),
            { id: 'none', label: 'Unassigned' },
          ]}
          value={occasionId}
          onChange={setOccasionId}
        />
      ) : null}

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      {loading ? <ThemedText themeColor="textSecondary">Loading…</ThemedText> : null}

      {visible.length === 0 && !loading ? (
        <ThemedText themeColor="textSecondary">
          Nothing pinned yet. Add a photo, a vibe, or paste a public Instagram URL.
        </ThemedText>
      ) : (
        <View style={styles.grid}>
          {visible.map((item) => (
            <View key={item.id} style={styles.cell}>
              <ItemCard item={item} href={`/item/${item.id}`} />
            </View>
          ))}
        </View>
      )}

      <Pressable
        onPress={() => {
          void signOut().then(() => router.replace('/sign-in'));
        }}
        style={styles.signOut}>
        <ThemedText type="small" themeColor="textSecondary">
          Sign out
        </ThemedText>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.one,
  },
  actions: {
    gap: Spacing.two,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.one,
  },
  cell: {
    width: '50%',
    padding: Spacing.one,
  },
  signOut: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.two,
  },
});
