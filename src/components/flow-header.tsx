import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FlowHeaderProps = {
  role: 'owner' | 'giver';
  title: string;
  subtitle?: string;
};

export function FlowHeader({ role, title, subtitle }: FlowHeaderProps) {
  const theme = useTheme();
  const owner = role === 'owner';

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.pill,
          {
            backgroundColor: owner ? theme.brandSoft : theme.backgroundSelected,
            borderColor: owner ? theme.brandSoft : theme.border,
          },
        ]}>
        <ThemedText type="eyebrow" style={{ color: owner ? theme.brandInk : theme.textSecondary }}>
          {owner ? 'Your list' : 'Giver view'}
        </ThemedText>
      </View>
      <ThemedText type="heading">{title}</ThemedText>
      {subtitle ? (
        <ThemedText themeColor="textSecondary" style={styles.sub}>
          {subtitle}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.two,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.two + 4,
    paddingVertical: Spacing.one + 1,
  },
  sub: {
    maxWidth: 480,
  },
});
