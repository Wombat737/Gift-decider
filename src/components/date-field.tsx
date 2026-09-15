import { Platform, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  accessibilityLabel?: string;
};

/** Calendar date (YYYY-MM-DD). Native date input on web; typed ISO date elsewhere. */
export function DateField({ label, value, onChange, hint, accessibilityLabel }: DateFieldProps) {
  const theme = useTheme();

  return (
    <View style={{ gap: Spacing.one }}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={accessibilityLabel ?? label}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        autoCorrect={false}
        {...(Platform.OS === 'web' ? ({ type: 'date' } as object) : { keyboardType: 'numbers-and-punctuation' })}
        style={{
          minHeight: 50,
          borderRadius: Radius.button,
          paddingHorizontal: Spacing.three,
          fontSize: 16,
          borderWidth: 1,
          color: theme.text,
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
        }}
      />
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}
