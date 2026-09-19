import { StyleSheet } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type InboxBannerProps = {
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
  accessibilityLabel: string;
};

export function InboxBanner({ title, body, actionLabel, onAction, accessibilityLabel }: InboxBannerProps) {
  const theme = useTheme();

  return (
    <Card
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft }]}>
      <ThemedText type="eyebrow" themeColor="brand">
        {title}
      </ThemedText>
      <ThemedText type="bodyEm">{body}</ThemedText>
      {actionLabel && onAction ? <Button label={actionLabel} variant="secondary" onPress={onAction} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});
