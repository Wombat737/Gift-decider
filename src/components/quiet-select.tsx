import { createElement } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type QuietSelectOption = { id: string; label: string };

type QuietSelectProps = {
  label: string;
  value: string;
  options: QuietSelectOption[];
  onChange: (id: string) => void;
};

/** Compact list, not a pill strip. Native uses an action sheet; web uses `<select>`. */
export function QuietSelect({ label, value, options, onChange }: QuietSelectProps) {
  const theme = useTheme();
  const current = options.find((option) => option.id === value)?.label ?? options[0]?.label ?? '';

  function onNativePick() {
    Alert.alert(label, undefined, [
      ...options.map((option) => ({
        text: option.label,
        onPress: () => onChange(option.id),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <ThemedText type="smallBold">{label}</ThemedText>
      {Platform.OS === 'web'
        ? createElement(
            'select',
            {
              value,
              'aria-label': label,
              onChange: (event: { target: { value: string } }) => onChange(event.target.value),
              style: {
                width: '100%',
                maxWidth: '100%',
                minHeight: 50,
                borderRadius: Radius.button,
                paddingLeft: Spacing.three,
                paddingRight: Spacing.three,
                fontSize: 16,
                borderWidth: 1,
                borderStyle: 'solid',
                borderColor: theme.border,
                backgroundColor: theme.backgroundElement,
                color: theme.text,
              },
            },
            ...options.map((option) => createElement('option', { key: option.id, value: option.id }, option.label)),
          )
        : (
            <NativePressable
              accessibilityRole="button"
              accessibilityLabel={label}
              onPress={onNativePick}
              style={[
                styles.native,
                { backgroundColor: theme.backgroundElement, borderColor: theme.border },
              ]}>
              <ThemedText>{current}</ThemedText>
            </NativePressable>
          )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: Spacing.one,
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
  },
  native: {
    minHeight: 50,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
});
