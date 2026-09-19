import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { badgeCountLabel } from '@/lib/inbox';

type HeaderInboxLinkProps = {
  label: string;
  count: number;
  onPress: () => void;
  accessibilityLabel?: string;
};

export function HeaderInboxLink({ label, count, onPress, accessibilityLabel }: HeaderInboxLinkProps) {
  const theme = useTheme();
  const badge = badgeCountLabel(count);
  const a11y = badge ? `${accessibilityLabel ?? label}, ${count} new` : (accessibilityLabel ?? label);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={onPress}
      hitSlop={12}
      style={styles.headerBtn}>
      <ThemedText type="smallBold" themeColor="brand">
        {label}
      </ThemedText>
      {badge ? (
        <View
          style={[styles.badge, { backgroundColor: theme.brand }]}
          accessibilityLabel={`${count} pending`}>
          <ThemedText type="caption" style={[styles.badgeText, { color: theme.brandText }]}>
            {badge}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontWeight: 700,
    fontSize: 11,
    lineHeight: 14,
  },
});
