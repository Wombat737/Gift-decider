import { ActivityIndicator, Keyboard, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { HelpTip } from '@/components/help-tip';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = TextInputProps & {
  label: string;
  hint?: string;
  help?: { title: string; body: string };
  loading?: boolean;
};

export function TextField({
  label,
  hint,
  help,
  loading = false,
  style,
  multiline,
  returnKeyType,
  blurOnSubmit,
  onSubmitEditing,
  ...rest
}: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <ThemedText type="smallBold" style={styles.label}>
          {label}
        </ThemedText>
        {help ? <HelpTip title={help.title} body={help.body} /> : null}
      </View>
      <View style={styles.inputWrap}>
        <TextInput
          placeholderTextColor={theme.textSecondary}
          multiline={multiline}
          returnKeyType={returnKeyType ?? (multiline ? 'default' : 'done')}
          blurOnSubmit={blurOnSubmit ?? !multiline}
          onSubmitEditing={(event) => {
            onSubmitEditing?.(event);
            if (!multiline) Keyboard.dismiss();
          }}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
            multiline && styles.multiline,
            loading && styles.inputLoading,
            style,
          ]}
          {...rest}
        />
        {loading ? (
          <View style={styles.spinner} pointerEvents="none">
            <ActivityIndicator accessibilityLabel="Fetching link preview" color={theme.brand} size="small" />
          </View>
        ) : null}
      </View>
      {hint ? (
        <ThemedText type="small" themeColor="textSecondary">
          {hint}
        </ThemedText>
      ) : null}
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
  inputWrap: {
    position: 'relative',
    width: '100%',
  },
  inputLoading: {
    paddingRight: 44,
  },
  spinner: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: '100%',
    minWidth: 0,
  },
  label: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  input: {
    minHeight: 50,
    borderRadius: Radius.button,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
    borderWidth: 1,
  },
  multiline: {
    minHeight: 104,
    paddingTop: Spacing.two + 6,
    textAlignVertical: 'top',
  },
});
