import { Link, type Href } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { KindPill, StageThumb } from '@/components/stage-thumb';
import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing, StageShadow } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { PrettyCopy } from '@/lib/copy';
import { giverStatusLabel } from '@/lib/format';
import { groupGiftPhase } from '@/lib/pledges';
import { giverCardSecondary, pickKindLabel } from '@/lib/stage-home';
import type { WishlistItem } from '@/lib/types';

type StageGiverCardProps = {
  item: WishlistItem;
  href: Href;
  onChoose: () => void;
  onSoftLock: () => void;
  onChipIn: () => void;
  chooseBusy?: boolean;
};

/** Stacked giver card. Coral Choose this, quiet soft-lock, sunshine Chip in on a group pick. */
export function StageGiverCard({
  item,
  href,
  onChoose,
  onSoftLock,
  onChipIn,
  chooseBusy = false,
}: StageGiverCardProps) {
  const theme = useTheme();
  const title = item.title || 'Untitled gift';
  const kind = pickKindLabel(item.item_kind);
  const secondary = giverCardSecondary(item, groupGiftPhase(item));
  const canChoose = item.status === 'available';

  return (
    <View style={[styles.card, StageShadow, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
      <Link href={href} asChild>
        <NativePressable
          accessibilityRole="link"
          accessibilityLabel={`${title}, ${kind}`}
          style={styles.top}>
          <StageThumb title={title} seed={item.id} />
          <View style={styles.copy}>
            <ThemedText type="titleSm" numberOfLines={2}>
              {title}
            </ThemedText>
            <KindPill label={kind} />
          </View>
        </NativePressable>
      </Link>
      {canChoose ? (
        <Button
          label={chooseBusy ? 'Saving…' : PrettyCopy.giverChooseCta}
          disabled={chooseBusy}
          onPress={onChoose}
          accessibilityLabel={`${PrettyCopy.giverChooseCta}, ${title}`}
        />
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {giverStatusLabel(item.status)}
        </ThemedText>
      )}
      {secondary === 'soft-lock' ? (
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel={`${PrettyCopy.giverSoftLockCta}, ${title}`}
          disabled={chooseBusy}
          onPress={onSoftLock}
          style={styles.textHit}>
          <ThemedText type="bodyEm" themeColor="textSecondary">
            {PrettyCopy.giverSoftLockCta}
          </ThemedText>
        </NativePressable>
      ) : null}
      {secondary === 'chip-in' ? (
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel={`${PrettyCopy.chipInCta}, ${title}`}
          onPress={onChipIn}
          style={[styles.chipIn, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
          <View style={[styles.dot, { backgroundColor: theme.accent }]} />
          <ThemedText type="bodyEm" style={{ color: theme.accentInk }}>
            {PrettyCopy.chipInCta}
          </ThemedText>
        </NativePressable>
      ) : null}
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
    gap: Spacing.three,
  },
  top: {
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
  textHit: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  chipIn: {
    minHeight: 44,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.button,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
