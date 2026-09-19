import { type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/empty-state';
import { ItemCard } from '@/components/item-card';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { EmptyIllustrationKind } from '@/components/empty-illustration';
import type { WishlistItem } from '@/lib/types';

type ItemGridProps = {
  items: WishlistItem[];
  hrefFor: (item: WishlistItem) => Href;
  showStatus?: boolean;
  emptyTitle: string;
  emptyBody: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  emptySecondaryLabel?: string;
  onEmptySecondary?: () => void;
  emptyKind?: EmptyIllustrationKind;
};

export function ItemGrid({
  items,
  hrefFor,
  showStatus = false,
  emptyTitle,
  emptyBody,
  emptyActionLabel,
  onEmptyAction,
  emptySecondaryLabel,
  onEmptySecondary,
  emptyKind = 'owner',
}: ItemGridProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        body={emptyBody}
        actionLabel={emptyActionLabel}
        onAction={onEmptyAction}
        secondaryLabel={emptySecondaryLabel}
        onSecondary={onEmptySecondary}
        kind={emptyKind}
      />
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

/** First-open placeholder — never the giver empty hero. */
export function ItemGridSkeleton() {
  const theme = useTheme();
  return (
    <View style={styles.grid} accessibilityLabel="Loading gifts" accessibilityRole="progressbar">
      {[0, 1, 2, 3].map((key) => (
        <View key={key} style={styles.cell}>
          <View style={[styles.skelCard, { backgroundColor: theme.paper, borderColor: theme.border }]}>
            <View style={[styles.skelImage, { backgroundColor: theme.backgroundSelected }]} />
            <View style={[styles.skelLine, { backgroundColor: theme.backgroundSelected }]} />
            <View style={[styles.skelLineShort, { backgroundColor: theme.backgroundSelected }]} />
          </View>
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
    padding: Spacing.one + 2,
  },
  skelCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    padding: Spacing.three,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  skelImage: {
    width: '100%',
    aspectRatio: 4 / 5,
    borderRadius: Radius.card - 4,
  },
  skelLine: {
    height: 12,
    width: '80%',
    borderRadius: Radius.pill,
  },
  skelLineShort: {
    height: 10,
    width: '46%',
    borderRadius: Radius.pill,
  },
});
