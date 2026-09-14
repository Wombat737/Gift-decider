import { type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ItemCard } from '@/components/item-card';
import { Spacing } from '@/constants/theme';
import type { WishlistItem } from '@/lib/types';

type ItemGridProps = {
  items: WishlistItem[];
  hrefFor: (item: WishlistItem) => Href;
  showStatus?: boolean;
  emptyTitle: string;
  emptyBody: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
};

export function ItemGrid({
  items,
  hrefFor,
  showStatus = false,
  emptyTitle,
  emptyBody,
  emptyActionLabel,
  onEmptyAction,
}: ItemGridProps) {
  if (items.length === 0) {
    return (
      <EmptyState title={emptyTitle} body={emptyBody} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
    );
  }

  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.id} style={styles.cell}>
          <ItemCard item={item} href={hrefFor(item)} showStatus={showStatus} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -Spacing.one,
  },
  cell: {
    width: '50%',
    padding: Spacing.one,
  },
});
