import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type FlowHeaderProps = {
  title: string;
  subtitle?: string;
};

/** Quiet in-page title. View-switcher pills were removed — testers treated them as broken buttons. */
export function FlowHeader({ title, subtitle }: FlowHeaderProps) {
  return (
    <View style={styles.wrap}>
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
  sub: {
    maxWidth: '100%',
    flexShrink: 1,
  },
});
