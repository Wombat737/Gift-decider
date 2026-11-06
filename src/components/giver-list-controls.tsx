import { StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GIVER_LIST_SORTS, type GiverListSort } from '@/lib/giver-list';

type GiverListControlsProps = {
  sort: GiverListSort;
  availableOnly: boolean;
  onSort: (sort: GiverListSort) => void;
  onAvailableOnly: (next: boolean) => void;
};

/** Compact session controls. Ink when selected — coral stays on Choose this. */
export function GiverListControls({ sort, availableOnly, onSort, onAvailableOnly }: GiverListControlsProps) {
  const theme = useTheme();

  return (
    <View style={styles.row} accessibilityLabel="Sort and filter">
      {GIVER_LIST_SORTS.map((option) => {
        const selected = option.id === sort;
        return (
          <NativePressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={`Sort, ${option.label}`}
            accessibilityState={{ selected }}
            onPress={() => onSort(option.id)}
            style={[
              styles.hit,
              {
                backgroundColor: selected ? theme.text : theme.backgroundElement,
                borderColor: selected ? theme.text : theme.border,
              },
            ]}>
            <ThemedText type="caption" style={{ color: selected ? theme.backgroundElement : theme.textSecondary, fontWeight: 600 }}>
              {option.label}
            </ThemedText>
          </NativePressable>
        );
      })}
      <NativePressable
        accessibilityRole="switch"
        accessibilityLabel="Available only"
        accessibilityState={{ checked: availableOnly }}
        onPress={() => onAvailableOnly(!availableOnly)}
        style={[
          styles.hit,
          {
            backgroundColor: availableOnly ? theme.text : theme.backgroundElement,
            borderColor: availableOnly ? theme.text : theme.border,
          },
        ]}>
        <ThemedText type="caption" style={{ color: availableOnly ? theme.backgroundElement : theme.textSecondary, fontWeight: 600 }}>
          Available only
        </ThemedText>
      </NativePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  hit: {
    minHeight: 44,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.twoHalf,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
