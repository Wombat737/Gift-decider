import { Alert, Platform, StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function showHelp(title: string, body: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
    window.alert(`${title}\n\n${body}`);
    return;
  }
  Alert.alert(title, body);
}

type HelpTipProps = {
  title: string;
  body: string;
  accessibilityLabel?: string;
};

/** Tiny “?” — short explainer, not a wall of grey copy under the field. */
export function HelpTip({ title, body, accessibilityLabel }: HelpTipProps) {
  const theme = useTheme();

  return (
    <NativePressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? `About ${title}`}
      hitSlop={10}
      onPress={() => showHelp(title, body)}
      style={[
        styles.hit,
        { backgroundColor: theme.backgroundElement, borderColor: theme.border },
      ]}>
      <ThemedText type="caption" themeColor="textSecondary">
        ?
      </ThemedText>
    </NativePressable>
  );
}

type LabelWithHelpProps = {
  label: string;
  help: { title: string; body: string };
};

export function LabelWithHelp({ label, help }: LabelWithHelpProps) {
  return (
    <View style={styles.labelRow}>
      <ThemedText type="smallBold" style={styles.label}>
        {label}
      </ThemedText>
      <HelpTip title={help.title} body={help.body} />
    </View>
  );
}

const styles = StyleSheet.create({
  hit: {
    width: 28,
    height: 28,
    minWidth: 28,
    minHeight: 28,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
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
});
