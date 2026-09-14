import * as Linking from 'expo-linking';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { auBuyLinks } from '@/lib/au-buy';
import type { WishlistItem } from '@/lib/types';

export function AuBuyLinks({ item }: { item: WishlistItem }) {
  const links = auBuyLinks(item.title, item.tags);

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold">Find it in AU stores</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Search links for Amazon AU, Kmart, Target AU, and Big W. No affiliate tracking.
      </ThemedText>
      <View style={styles.buttons}>
        {item.buy_url ? (
          <Button label="Open their buy link" variant="secondary" onPress={() => void Linking.openURL(item.buy_url!)} />
        ) : null}
        {links.map((link) => (
          <Button key={link.id} label={link.label} variant="ghost" onPress={() => void Linking.openURL(link.url)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  buttons: {
    gap: Spacing.one,
  },
});
