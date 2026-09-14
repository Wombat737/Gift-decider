import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ItemCard } from '@/components/item-card';
import { Screen } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/context/auth-context';
import { useWishlist } from '@/context/wishlist-context';
import { Spacing } from '@/constants/theme';

export default function WishlistGridScreen() {
  const { user, signOut } = useAuth();
  const { items, loading, error } = useWishlist();

  return (
    <Screen>
      <View style={styles.header}>
        <ThemedText type="heading">What you actually want</ThemedText>
        <ThemedText themeColor="textSecondary">
          Photo-first list for {user?.email ?? 'you'}. Givers never see who else reserved what unless you tell them.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <Button label="Add item" onPress={() => router.push('/add')} />
        <Button label="Paste Instagram URL" variant="secondary" onPress={() => router.push('/paste')} />
        <Button label="Share / invite" variant="ghost" onPress={() => router.push('/share')} />
      </View>

      {error ? (
        <ThemedText type="small" themeColor="accent">
          {error}
        </ThemedText>
      ) : null}

      {loading ? <ThemedText themeColor="textSecondary">Loading…</ThemedText> : null}

      {items.length === 0 && !loading ? (
        <ThemedText themeColor="textSecondary">Nothing pinned yet. Add a photo or paste a public Instagram URL.</ThemedText>
      ) : (
        <View style={styles.grid}>
          {items.map((item) => (
            <View key={item.id} style={styles.cell}>
              <ItemCard item={item} onPress={() => router.push(`/item/${item.id}`)} />
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
