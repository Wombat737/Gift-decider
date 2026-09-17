import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, readableThemeColor, ThemeColor, TypeScale } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'caption'
    | 'body'
    | 'bodyEm'
    | 'titleSm'
    | 'title'
    | 'display'
    | 'default'
    | 'heading'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'code'
    | 'eyebrow'
    | 'moment'
    | 'momentSmall';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        styles.base,
        { color: readableThemeColor(theme, themeColor ?? 'text') },
        type === 'caption' && styles.caption,
        type === 'body' && styles.body,
        type === 'bodyEm' && styles.bodyEm,
        type === 'titleSm' && styles.titleSm,
        type === 'display' && styles.display,
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'heading' && styles.heading,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'code' && styles.code,
        type === 'eyebrow' && styles.eyebrow,
        type === 'moment' && styles.moment,
        type === 'momentSmall' && styles.momentSmall,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    maxWidth: '100%',
  },
  caption: {
    fontFamily: Fonts.sans,
    ...TypeScale.caption,
  },
  body: {
    fontFamily: Fonts.sans,
    ...TypeScale.body,
  },
  bodyEm: {
    fontFamily: Fonts.sans,
    ...TypeScale.bodyEm,
  },
  titleSm: {
    fontFamily: Fonts.sans,
    ...TypeScale.titleSm,
  },
  display: {
    fontFamily: Fonts.sans,
    ...TypeScale.display,
    letterSpacing: -0.4,
  },
  small: {
    fontFamily: Fonts.sans,
    ...TypeScale.caption,
  },
  smallBold: {
    fontFamily: Fonts.sans,
    ...TypeScale.bodyEm,
  },
  default: {
    fontFamily: Fonts.sans,
    ...TypeScale.body,
  },
  heading: {
    fontFamily: Fonts.sans,
    ...TypeScale.title,
    letterSpacing: -0.2,
  },
  title: {
    fontFamily: Fonts.sans,
    ...TypeScale.display,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Fonts.sans,
    ...TypeScale.titleSm,
  },
  moment: {
    fontFamily: Fonts.sans,
    ...TypeScale.title,
    letterSpacing: -0.2,
  },
  momentSmall: {
    fontFamily: Fonts.sans,
    ...TypeScale.caption,
  },
  link: {
    fontFamily: Fonts.sans,
    ...TypeScale.bodyEm,
  },
  eyebrow: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.caption.fontSize,
    lineHeight: TypeScale.caption.lineHeight,
    fontWeight: 600,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: TypeScale.caption.fontSize,
    lineHeight: TypeScale.caption.lineHeight,
  },
});
