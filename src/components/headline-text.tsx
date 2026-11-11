import { StyleSheet, type StyleProp, type TextStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { headlineRuns } from '@/lib/headlines';

type HeadlineTextProps = {
  text: string;
  style?: StyleProp<TextStyle>;
};

/** Serif headline. Words in *asterisks* are italic. Scales with system text. */
export function HeadlineText({ text, style }: HeadlineTextProps) {
  const runs = headlineRuns(text);
  return (
    <ThemedText type="display" accessibilityRole="header" style={[styles.headline, style]}>
      {runs.map((run, index) =>
        run.emphasis ? (
          <ThemedText key={`${index}-${run.text}`} style={styles.emphasis}>
            {run.text}
          </ThemedText>
        ) : (
          run.text
        ),
      )}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  headline: {
    flexShrink: 1,
  },
  emphasis: {
    fontFamily: FontFamilies.serifItalic,
  },
});
