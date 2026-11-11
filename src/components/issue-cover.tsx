import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { HeadlineText } from '@/components/headline-text';
import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { FontFamilies, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { coverMark, coverOverrideLabel, resolveCoverTreatment, type CoverOverride } from '@/lib/cover';

type IssueCoverProps = {
  title: string;
  headline?: string | null;
  kicker: string;
  imageUrl?: string | null;
  override?: CoverOverride;
  onChangeCover?: () => void;
  onPress?: () => void;
};

/** Full-bleed photo, a tilted print on stone, or a serif letter on oxblood. */
export function IssueCover({ title, headline, kicker, imageUrl, override = 'auto', onChangeCover, onPress }: IssueCoverProps) {
  const theme = useTheme();
  const [measured, setMeasured] = useState<{ uri: string; width: number; height: number } | null>(null);
  const uri = (imageUrl ?? '').trim();
  const size = measured?.uri === uri ? measured : null;

  const treatment = resolveCoverTreatment({
    imageUrl: uri,
    width: size?.width,
    height: size?.height,
    override,
  });
  const mark = coverMark(headline || title);
  const display = headline?.trim() || title;

  const art =
    treatment === 'full' && uri ? (
      <Image
        source={{ uri }}
        style={styles.bleed}
        contentFit="cover"
        onLoad={(event) => {
          const width = event.source?.width ?? 0;
          const height = event.source?.height ?? 0;
          if (width && height) setMeasured({ uri, width, height });
        }}
        onError={() => setMeasured({ uri, width: 1, height: 1 })}
      />
    ) : treatment === 'print' && uri ? (
      <View style={[styles.stone, { backgroundColor: theme.stone }]}>
        <View style={[styles.print, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
          <Image
            source={{ uri }}
            style={styles.printImage}
            contentFit="cover"
            onLoad={(event) => {
              const width = event.source?.width ?? 0;
              const height = event.source?.height ?? 0;
              if (width && height) setMeasured({ uri, width, height });
            }}
          />
        </View>
      </View>
    ) : (
      <View style={[styles.letter, { backgroundColor: theme.brand }]}>
        <ThemedText style={styles.numeral}>{mark}</ThemedText>
      </View>
    );

  const body = (
    <View style={[styles.frame, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      {art}
      <View style={styles.caption}>
        <ThemedText type="eyebrow" themeColor="textSecondary">
          {kicker}
        </ThemedText>
        {headline ? <HeadlineText text={headline} /> : <HeadlineText text={title} />}
        {headline ? (
          <ThemedText type="small" themeColor="textSecondary">
            {title}
          </ThemedText>
        ) : null}
      </View>
      {onChangeCover ? (
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel={`Cover, ${coverOverrideLabel(override)}. Change`}
          onPress={onChangeCover}
          style={styles.change}
          hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            Cover · {coverOverrideLabel(override)} · Change
          </ThemedText>
        </NativePressable>
      ) : null}
    </View>
  );

  if (!onPress) return body;
  return (
    <NativePressable accessibilityRole="button" accessibilityLabel={display} onPress={onPress}>
      {body}
    </NativePressable>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
  },
  bleed: {
    width: '100%',
    aspectRatio: 4 / 5,
  },
  stone: {
    width: '100%',
    aspectRatio: 4 / 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  print: {
    width: '46%',
    aspectRatio: 3 / 4,
    borderWidth: 1,
    transform: [{ rotate: '-7deg' }],
    overflow: 'hidden',
  },
  printImage: {
    width: '100%',
    height: '100%',
  },
  letter: {
    width: '100%',
    aspectRatio: 4 / 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeral: {
    fontFamily: FontFamilies.serif,
    fontSize: 120,
    lineHeight: 128,
    color: '#FBF9F4',
  },
  caption: {
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
  },
  change: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
});
