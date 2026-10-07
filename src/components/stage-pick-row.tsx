import { Link, type Href } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { KindPill, StageThumb } from '@/components/stage-thumb';
import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, StageShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickKindLabel } from '@/lib/stage-home';
import type { WishlistItem } from '@/lib/types';

type StagePickRowProps = {
  item: WishlistItem;
  href: Href;
};

/** Owner home row. Title + Exact/Taste only — no reserve, purchase, or pledge chrome. */
export function StagePickRow({ item, href }: StagePickRowProps) {
  const theme = useTheme();
  const title = item.title || 'Untitled gift';
  const kind = pickKindLabel(item.item_kind);

  return (
    <View style={[styles.card, StageShadow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Link href={href} asChild>
        <NativePressable
          accessibilityRole="link"
          accessibilityLabel={`${title}, ${kind}`}
          style={styles.row}>
          <StageThumb title={title} seed={item.id} />
          <View style={styles.copy}>
            <ThemedText type="titleSm" numberOfLines={2}>
              {title}
            </ThemedText>
            <KindPill label={kind} />
          </View>
        </NativePressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    borderRadius: Radius.card,
    borderWidth: 1,
    padding: Spacing.three,
  },
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
  },
});
