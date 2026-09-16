import { Platform, StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export const SUGGESTED_VIBES = [
  'cozy',
  'minimal',
  'outdoors',
  'kitchen',
  'playful',
  'quiet luxury',
  'colourful',
  'practical',
  'home',
  'coffee',
];

type VibeChipsProps = {
  tags: string[];
  selected?: string[];
  onToggle?: (tag: string) => void;
};

export function VibeChips({ tags, selected, onToggle }: VibeChipsProps) {
  const theme = useTheme();
  if (tags.length === 0) return null;

  return (
    <View style={styles.row}>
      {tags.map((tag) => {
        const active = selected ? selected.includes(tag) : true;
        const ChipWrap = onToggle ? NativePressable : View;
        return (
          <ChipWrap
            key={tag}
            onPress={onToggle ? () => onToggle(tag) : undefined}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.brandSoft : theme.backgroundElement,
                borderColor: active ? theme.brand : theme.border,
              },
            ]}>
            <ThemedText type="small" style={{ color: active ? theme.brandInk : theme.text }}>
              {tag}
            </ThemedText>
          </ChipWrap>
        );
      })}
    </View>
  );
}

type FilterChipsProps = {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
};

export function FilterChips({ options, value, onChange }: FilterChipsProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <NativePressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.brand : theme.backgroundElement,
                borderColor: active ? theme.brand : theme.border,
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: active ? theme.brandText : theme.text }}>
              {option.label}
            </ThemedText>
          </NativePressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 4,
    width: '100%',
    maxWidth: '100%',
  },
  chip: {
    maxWidth: '100%',
    flexShrink: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 3,
    borderWidth: 1,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
});
