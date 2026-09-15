import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { auBuyLinks } from '@/lib/au-buy';
import { inspectBuyLink, linkHealthCopy, linkNeedsHeal } from '@/lib/link-health';
import { substituteModeCopy } from '@/lib/substitutes';
import type { GiftSubstitute, WishlistItem } from '@/lib/types';
import { suggestForGiver } from '@/services/improv';

type LinkHealPanelProps = {
  item: WishlistItem;
  busy?: boolean;
  demo?: boolean;
  onMarkDead: (dead: boolean) => void;
  onDemoCheck?: () => void;
};

export function LinkHealPanel({ item, busy, demo, onMarkDead, onDemoCheck }: LinkHealPanelProps) {
  const health = inspectBuyLink(item);
  const needsHeal = linkNeedsHeal(item);
  const [suggestions, setSuggestions] = useState<GiftSubstitute[]>([]);

  useEffect(() => {
    let cancelled = false;
    void suggestForGiver(item).then((rows) => {
      if (!cancelled) setSuggestions(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [item]);

  const recoveryQuery = suggestions[0]?.query ?? item.title ?? '';
  const recoveryLinks = auBuyLinks(recoveryQuery, item.tags);
  const showAlternates = !item.no_substitution && needsHeal;

  return (
    <Card accessibilityLabel="giver-link-heal">
      <ThemedText type="eyebrow" themeColor="brand">
        Givers only
      </ThemedText>
      <ThemedText type="smallBold">Buy link heal</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        They won’t see this. {substituteModeCopy(item)}
      </ThemedText>
      <ThemedText
        type="smallBold"
        themeColor={health === 'ok' ? 'brand' : 'accent'}
        accessibilityLabel={`link-health-${health}`}>
        {linkHealthCopy(health)}
      </ThemedText>

      {item.no_substitution ? (
        <View style={styles.block}>
          <ThemedText type="small">
            Exact lock is on. Recovery searches for this SKU — not a substitute.
          </ThemedText>
          {needsHeal
            ? recoveryLinks.map((link) => (
                <Button
                  key={link.id}
                  label={`${link.label} (exact)`}
                  variant="ghost"
                  onPress={() => void Linking.openURL(link.url)}
                />
              ))
            : null}
        </View>
      ) : showAlternates ? (
        <View style={styles.block}>
          <ThemedText type="smallBold">Vibe-close alternatives</ThemedText>
          {suggestions.map((row) => {
            const links = auBuyLinks(row.query, row.vibeTags);
            return (
              <View key={row.id} style={styles.suggestion} accessibilityLabel={`substitute-${row.id}`}>
                <ThemedText type="smallBold">{row.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {row.reason}
                </ThemedText>
                {links.slice(0, 2).map((link) => (
                  <Button
                    key={`${row.id}-${link.id}`}
                    label={link.label}
                    variant="ghost"
                    onPress={() => void Linking.openURL(link.url)}
                  />
                ))}
              </View>
            );
          })}
        </View>
      ) : null}

      <Button
        label={item.buy_url_dead ? 'Unmark dead link' : 'Link’s dead'}
        variant="secondary"
        disabled={busy}
        accessibilityLabel="mark-link-dead"
        onPress={() => onMarkDead(!item.buy_url_dead)}
      />
      {demo && onDemoCheck ? (
        <Button
          label="Check link (demo stub)"
          variant="ghost"
          disabled={busy}
          accessibilityLabel="demo-link-check"
          onPress={onDemoCheck}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: Spacing.two,
  },
  suggestion: {
    gap: Spacing.one,
  },
});
