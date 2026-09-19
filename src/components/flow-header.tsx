import { StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { ChipPad, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type FlowHeaderProps = {
  role: 'owner' | 'giver';
  title: string;
  subtitle?: string;
  onYourList?: () => void;
  onGiverView?: () => void;
};

export function FlowHeader({ role, title, subtitle, onYourList, onGiverView }: FlowHeaderProps) {
  const theme = useTheme();
  const owner = role === 'owner';

  return (
    <View style={styles.wrap}>
      <View style={styles.pills}>
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel="Your list"
          accessibilityState={{ selected: owner }}
          onPress={onYourList}
          style={[
            styles.pill,
            owner
              ? { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft }
              : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText type="eyebrow" style={{ color: owner ? theme.brandInk : theme.textSecondary }}>
            Your list
          </ThemedText>
        </NativePressable>
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel="Giver view"
          accessibilityState={{ selected: !owner }}
          onPress={onGiverView}
          style={[
            styles.pill,
            !owner
              ? { backgroundColor: theme.brandSoft, borderColor: theme.brandSoft }
              : { backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}>
          <ThemedText type="eyebrow" style={{ color: !owner ? theme.brandInk : theme.textSecondary }}>
            Giver view
          </ThemedText>
        </NativePressable>
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
