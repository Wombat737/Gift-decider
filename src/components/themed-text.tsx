import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { FontFamilies, Fonts, readableThemeColor, ThemeColor, TypeScale } from '@/constants/theme';
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
    fontFamily: FontFamilies.sansMedium,
    fontSize: TypeScale.caption.fontSize,
    lineHeight: TypeScale.caption.lineHeight,
  },
  body: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.body.fontSize,
    lineHeight: TypeScale.body.lineHeight,
  },
  bodyEm: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: TypeScale.bodyEm.fontSize,
    lineHeight: TypeScale.bodyEm.lineHeight,
  },
  titleSm: {
    fontFamily: Fonts.serif,
    fontSize: TypeScale.titleSm.fontSize,
    lineHeight: 26,
    letterSpacing: -0.22,
  },
  display: {
    fontFamily: Fonts.serif,
    fontSize: TypeScale.display.fontSize,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  small: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.caption.fontSize,
    lineHeight: TypeScale.caption.lineHeight,
  },
  smallBold: {
    fontFamily: FontFamilies.sansSemibold,
    fontSize: TypeScale.body.fontSize,
    lineHeight: TypeScale.body.lineHeight,
  },
  default: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.body.fontSize,
    lineHeight: TypeScale.body.lineHeight,
  },
  heading: {
    fontFamily: Fonts.serif,
    fontSize: TypeScale.title.fontSize,
    lineHeight: 30,
    letterSpacing: -0.28,
  },
  title: {
    fontFamily: Fonts.serif,
    fontSize: TypeScale.display.fontSize,
    lineHeight: 38,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontFamily: Fonts.serif,
    fontSize: TypeScale.titleSm.fontSize,
    lineHeight: 26,
  },
  moment: {
    fontFamily: Fonts.serif,
    fontSize: TypeScale.title.fontSize,
    lineHeight: 30,
    letterSpacing: -0.28,
  },
  momentSmall: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: TypeScale.caption.fontSize,
    lineHeight: TypeScale.caption.lineHeight,
  },
  link: {
    fontFamily: FontFamilies.sansMedium,
    fontSize: TypeScale.bodyEm.fontSize,
    lineHeight: TypeScale.bodyEm.lineHeight,
  },
  eyebrow: {
    fontFamily: FontFamilies.sansSemibold,
    fontSize: TypeScale.caption.fontSize,
    lineHeight: TypeScale.caption.lineHeight,
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
