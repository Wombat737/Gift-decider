import { Platform, Pressable, StyleSheet, View } from 'react-native';

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
        const ChipWrap = onToggle ? Pressable : View;
        return (
          <ChipWrap
            key={tag}
            onPress={onToggle ? () => onToggle(tag) : undefined}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: active ? theme.text : theme.backgroundSelected,
              },
            ]}>
            <ThemedText type="small">{tag}</ThemedText>
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
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              {
                backgroundColor: active ? theme.accent : theme.backgroundElement,
              },
            ]}>
            <ThemedText type="smallBold" style={{ color: active ? theme.accentText : theme.text }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one + 2,
  },
  chip: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.two + 2,
    paddingVertical: Spacing.one + 2,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
});
