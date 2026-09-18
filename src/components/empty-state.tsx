import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { EmptyIllustration, type EmptyIllustrationKind } from '@/components/empty-illustration';
import { type FlairIconName } from '@/components/flair-icons';
import { HeroWash } from '@/components/hero-wash';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type EmptyStateProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: FlairIconName;
  secondaryLabel?: string;
  onSecondary?: () => void;
  kind?: EmptyIllustrationKind;
};

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  actionIcon,
  secondaryLabel,
  onSecondary,
  kind = 'owner',
}: EmptyStateProps) {
  const resolvedIcon =
    actionIcon ?? (kind === 'giver' ? 'nudge' : kind === 'invites' ? 'share' : 'add');
  return (
    <HeroWash variant="hero" style={styles.wrap} accessibilityLabel="empty-state">
      <EmptyIllustration kind={kind} />
      <ThemedText type="display" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        {body}
      </ThemedText>
      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <Button label={actionLabel} icon={resolvedIcon} onPress={onAction} />
        </View>
      ) : null}
      {secondaryLabel && onSecondary ? (
        <View style={styles.actions}>
          <Button label={secondaryLabel} variant="ghost" onPress={onSecondary} />
        </View>
      ) : null}
    </HeroWash>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: Spacing.twoHalf,
    paddingVertical: Spacing.five,
    overflow: 'visible',
  },
  title: {
    textAlign: 'center',
    letterSpacing: -0.14,
  },
  body: {
    textAlign: 'center',
    width: '100%',
    maxWidth: 360,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
  },
});
