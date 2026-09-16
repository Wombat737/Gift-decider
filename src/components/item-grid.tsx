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
        <View key={`${item.id}:${item.status}:${item.reserved_at ?? ''}`} style={styles.cell}>
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
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  cell: {
    width: '50%',
    maxWidth: '50%',
    minWidth: 0,
    flexGrow: 0,
    flexShrink: 0,
    padding: Spacing.one,
  },
});
