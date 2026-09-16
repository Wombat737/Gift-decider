import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { formatAud } from '@/lib/format';
import { formatRevealDate, isFunded, isRevealDue, pledgeRemaining, pledgeTotal } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

type GroupGiftStripProps = {
  item: WishlistItem;
};

/** Giver-only pledge strip: sunshine bar, reveal date, PayID note. */
export function GroupGiftStrip({ item }: GroupGiftStripProps) {
  const theme = useTheme();
  const total = pledgeTotal(item);
  const remaining = pledgeRemaining(item);
  const funded = isFunded(item);
  const revealed = isRevealDue(item);
  const target = item.target_amount;
  const ratio = target && target > 0 ? Math.min(1, total / target) : funded ? 1 : 0;
  const revealLabel = formatRevealDate(item.reveal_at);

  return (
    <View style={styles.wrap} accessibilityLabel="group-gift-strip">
      <View style={[styles.track, { backgroundColor: theme.paper }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.round(ratio * 100)}%`,
              backgroundColor: theme.accent,
            },
          ]}
        />
      </View>
      <ThemedText>
        {formatAud(total)}
        {target ? ` of ${formatAud(target)}` : ''} chipped in
        {funded ? ' · Funded' : remaining != null ? ` · ${formatAud(remaining)} to go` : ''}
      </ThemedText>
      <View style={styles.metaRow}>
        <View style={[styles.pill, { backgroundColor: theme.accentMuted, borderColor: theme.accentMuted }]}>
          <ThemedText type="smallBold" themeColor="accent">
            Reveal {revealLabel}
            {revealed ? ' · arrived' : ''}
          </ThemedText>
        </View>
      </View>
      {item.pay_instructions ? (
        <ThemedText type="small" themeColor="textSecondary" accessibilityLabel="group-gift-payid">
          Pay the organiser: {item.pay_instructions}
        </ThemedText>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          Add a PayID / BSB so givers know how to pay the organiser. Honour system — no money in the app.
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  track: {
    height: 10,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: Radius.pill,
    minWidth: 0,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one,
  },
});
