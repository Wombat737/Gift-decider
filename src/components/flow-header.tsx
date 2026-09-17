import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ChipPad, Radius, Spacing } from '@/constants/theme';
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
      <View style={styles.pills} accessibilityRole="text">
        <View
          style={[
            styles.pill,
            owner
              ? { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft }
              : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText
            type="eyebrow"
            style={{ color: owner ? theme.brandInk : theme.textSecondary }}>
            Your list
          </ThemedText>
        </View>
        <View
          style={[
            styles.pill,
            !owner
              ? { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft }
              : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText
            type="eyebrow"
            style={{ color: !owner ? theme.brandInk : theme.textSecondary }}>
            Giver view
          </ThemedText>
        </View>
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
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    width: '100%',
  },
  pill: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: '100%',
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: ChipPad.horizontal,
    paddingVertical: ChipPad.vertical,
  },
  sub: {
    maxWidth: '100%',
    flexShrink: 1,
  },
});
