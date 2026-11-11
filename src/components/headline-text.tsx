import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { FontFamilies } from '@/constants/theme';
import { headlineRuns } from '@/lib/headlines';

type HeadlineTextProps = {
  text: string;
  style?: StyleProp<TextStyle>;
};

/**
 * Serif headline. Words in *asterisks* are italic at the same size as the roman.
 * A nested themed text would fall back to body size and look tiny.
 */
export function HeadlineText({ text, style }: HeadlineTextProps) {
  const flat = StyleSheet.flatten(style) ?? {};
  const runs = headlineRuns(text);
  const shared: TextStyle = {
    fontSize: flat.fontSize,
    lineHeight: flat.lineHeight,
    letterSpacing: flat.letterSpacing,
    color: flat.color,
  };
  return (
    <Text accessibilityRole="header" style={[styles.headline, style]}>
      {runs.map((run, index) =>
        run.emphasis ? (
          <Text key={`${index}-${run.text}`} style={[shared, styles.emphasis]}>
            {run.text}
          </Text>
        ) : (
          <Text key={`${index}-${run.text}`} style={[shared, styles.roman]}>
            {run.text}
          </Text>
        ),
      )}
    </Text>
  );
}

const styles = StyleSheet.create({
  headline: {
    flexShrink: 1,
    fontFamily: FontFamilies.serif,
  },
  roman: {
    fontFamily: FontFamilies.serif,
  },
  emphasis: {
    fontFamily: FontFamilies.serifItalic,
    fontStyle: 'normal',
  },
});
