import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { formatRevealDate, pickOrganiserName } from '@/lib/pledges';
import type { WishlistItem } from '@/lib/types';
import { useTheme } from '@/hooks/use-theme';

type ReadyToBuyBannerProps = {
  item?: WishlistItem;
  items?: WishlistItem[];
  revealLabel?: string;
  onMarkPurchased?: () => void;
  busy?: boolean;
};

/** Giver-only. Coral brand-soft strip — not a purchased success state. */
export function ReadyToBuyBanner({
  item,
  items,
  revealLabel,
  onMarkPurchased,
  busy,
}: ReadyToBuyBannerProps) {
  const theme = useTheme();
  const list = items ?? (item ? [item] : []);
  if (list.length === 0) return null;

  const single = item ?? (list.length === 1 ? list[0] : undefined);
  const organiser = single ? pickOrganiserName(single) : null;
  const when = revealLabel ?? (single ? formatRevealDate(single.reveal_at) : null);
  const notice = single?.notices?.find((row) => row.kind === 'ready_to_buy');
  const listMode = !item && list.length > 0;
  const canMark = Boolean(onMarkPurchased) && single && single.status !== 'purchased';

  return (
    <Card
      accessibilityLabel={listMode ? 'organiser-ready-to-buy-list' : 'organiser-ready-to-buy'}
      style={[styles.card, { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft }]}>
      <ThemedText type="eyebrow" themeColor="brand">
        Givers only
      </ThemedText>
      <ThemedText type="moment">Funded — time to buy</ThemedText>
      {listMode ? (
        <>
          <ThemedText type="bodyEm">
            Pledges hit the target. The organiser should buy, then mark purchased and pick delivery.
          </ThemedText>
          {list.map((row) => (
            <ThemedText key={row.id} type="caption" themeColor="textSecondary">
              {row.title || 'Untitled gift'} · organiser {pickOrganiserName(row)} · reveal{' '}
              {formatRevealDate(row.reveal_at)}
            </ThemedText>
          ))}
          <ThemedText type="caption" themeColor="textSecondary">
            The recipient stays unspoiled until the reveal date. Push notifications are next — this banner is
            the in-app alert.
          </ThemedText>
        </>
      ) : (
        <>
          <ThemedText type="bodyEm">
            {organiser} is the organiser. Buy it, then mark purchased and pick delivery.
          </ThemedText>
          <ThemedText type="caption" themeColor="textSecondary">
            They still won’t see who chipped in until {when}. Push notifications are next — this in-app banner
            is the alert for now.
          </ThemedText>
          {notice?.email_preview ? (
            <ThemedText type="caption" themeColor="textSecondary" accessibilityLabel="ready-to-buy-email-stub">
              Email stub (no key required): {notice.email_preview.split('\n')[0]}
            </ThemedText>
          ) : null}
        </>
      )}
      {canMark ? (
        <Button
          label="Mark purchased"
          icon="bought"
          disabled={busy}
          onPress={onMarkPurchased}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
