import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  HEAL_BADGE,
  HEAL_SEE_ALTERNATIVES,
  healLink,
  shouldRenderHealUi,
  shouldShowHealAlternatives,
} from '@/lib/heal-link';
import { inspectBuyLink } from '@/lib/link-health';
import { substituteModeCopy } from '@/lib/substitutes';
import type { WishlistItem } from '@/lib/types';

type LinkHealPanelProps = {
  item: WishlistItem;
  busy?: boolean;
  demo?: boolean;
  onMarkDead: (dead: boolean) => void;
  onCheckLink?: () => void;
};

export function LinkHealPanel({ item, busy, demo, onMarkDead, onCheckLink }: LinkHealPanelProps) {
  const theme = useTheme();
  const result = healLink(item);
  const needsHeal = shouldRenderHealUi('giver', item);
  const showAlternates = shouldShowHealAlternatives('giver', item);
  const [sheetOpen, setSheetOpen] = useState(false);
  const health = inspectBuyLink(item);

  useEffect(() => {
    if (!needsHeal) setSheetOpen(false);
  }, [needsHeal]);

  return (
    <>
      <Card
        accessibilityLabel="giver-link-heal"
        style={needsHeal ? { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft } : undefined}>
        <ThemedText type="eyebrow" themeColor="brand">
          Givers only
        </ThemedText>
        <ThemedText type="smallBold" accessibilityLabel={needsHeal ? 'link-may-be-broken' : `link-health-${health}`}>
          {needsHeal ? HEAL_BADGE : result.copy}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          They won’t see this. {substituteModeCopy(item)}
          {demo ? ' Heuristic stub — no LLM key.' : ''}
        </ThemedText>

        {showAlternates ? (
          <Button
            label={HEAL_SEE_ALTERNATIVES}
            accessibilityLabel="see-alternatives"
            onPress={() => setSheetOpen(true)}
          />
        ) : null}

        {item.buy_url || onCheckLink ? (
          <Button
            label="Check link"
            variant="secondary"
            disabled={busy || !onCheckLink}
            accessibilityLabel="check-buy-link"
            onPress={() => onCheckLink?.()}
          />
        ) : null}

        <Button
          label={item.buy_url_dead ? 'Unmark dead link' : 'Link’s dead'}
          variant="ghost"
          disabled={busy}
          accessibilityLabel="mark-link-dead"
          onPress={() => onMarkDead(!item.buy_url_dead)}
        />
      </Card>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.overlay, { backgroundColor: theme.overlay }]}
            accessibilityLabel="close-heal-sheet"
            onPress={() => setSheetOpen(false)}
          />
          <ScrollView
            style={[styles.sheet, { backgroundColor: theme.background, borderColor: theme.border }]}
            contentContainerStyle={styles.sheetInner}
            accessibilityLabel="heal-alternatives-sheet">
            <ThemedText type="eyebrow" themeColor="brand">
              Givers only
            </ThemedText>
            <ThemedText type="moment">Close alternatives</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Heuristic stub — title + vibe tags, AU search URLs. A cheap LLM can fill this list later without
              a UI rewrite.
            </ThemedText>
            {result.alternatives.map((row) => (
              <View key={row.id} style={styles.suggestion} accessibilityLabel={`heal-alternative-${row.id}`}>
                <ThemedText type="smallBold">{row.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {row.merchant}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {row.reason}
                </ThemedText>
                <Button
                  label={`Open ${row.merchant}`}
                  variant="secondary"
                  onPress={() => void Linking.openURL(row.buyUrl)}
                />
              </View>
            ))}
            <Button label="Close" variant="ghost" onPress={() => setSheetOpen(false)} />
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
  },
  sheet: {
    zIndex: 2,
    borderTopLeftRadius: Radius.card,
    borderTopRightRadius: Radius.card,
    borderWidth: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
    maxHeight: '86%',
  },
  sheetInner: {
    gap: Spacing.three,
  },
  suggestion: {
    gap: Spacing.one,
  },
});
