import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { HeadlineText } from '@/components/headline-text';
import { PersonAvatar } from '@/components/person-avatar';
import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { coverMark, resolveCoverTreatment, type CoverOverride, type CoverTreatment } from '@/lib/cover';

export const ICON = '#7A7166';
export const INK = '#1A1714';
export const PAPER = '#F3EFE6';
export const CARD = '#FBF9F4';
export const RULE = '#D9D2C4';
export const STONE = '#E4DCCC';
export const MUTED = '#6B645B';
export const OXBLOOD = '#7A1F2B';

type CoverArtProps = {
  uri?: string | null;
  title: string;
  eventOn?: string | null;
  override?: CoverOverride;
  width?: number | null;
  height?: number | null;
  flagged?: boolean;
  frameHeight: number;
  thumb?: boolean;
};

export function CoverArt({ uri, title, eventOn, override = 'auto', width, height, flagged, frameHeight, thumb = false }: CoverArtProps) {
  const [measured, setMeasured] = useState<{ uri: string; width: number; height: number } | null>(null);
  const photo = (uri ?? '').trim();
  const size = measured?.uri === photo ? measured : null;
  const treatment: CoverTreatment = resolveCoverTreatment({
    imageUrl: photo,
    width: size?.width || width,
    height: size?.height || height,
    flagged,
    override,
  });
  const mark = coverMark(title, eventOn);
  const markSize = thumb ? 37 : Math.min(160, frameHeight * 0.62);

  if (treatment === 'full' && photo) {
    return (
      <Image
        source={{ uri: photo }}
        style={{ width: '100%', height: frameHeight }}
        contentFit="cover"
        onLoad={(event) => {
          const nextWidth = event.source?.width ?? 0;
          const nextHeight = event.source?.height ?? 0;
          if (nextWidth && nextHeight) setMeasured({ uri: photo, width: nextWidth, height: nextHeight });
        }}
      />
    );
  }

  if (treatment === 'print' && photo) {
    return (
      <View style={[styles.printGround, { height: frameHeight, backgroundColor: STONE }]}>
        <View style={[styles.print, thumb ? styles.printThumb : styles.printCover]}>
          <Image
            source={{ uri: photo }}
            style={thumb ? styles.printImageThumb : styles.printImage}
            contentFit="cover"
            onLoad={(event) => {
              const nextWidth = event.source?.width ?? 0;
              const nextHeight = event.source?.height ?? 0;
              if (nextWidth && nextHeight) setMeasured({ uri: photo, width: nextWidth, height: nextHeight });
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.letter, { height: frameHeight, backgroundColor: OXBLOOD }]}>
      <ThemedText style={[styles.letterMark, { fontSize: markSize, lineHeight: markSize }]}>{mark}</ThemedText>
    </View>
  );
}

export function KickerTag({ label }: { label: string }) {
  return (
    <View style={styles.kicker}>
      <ThemedText style={styles.kickerText}>{label}</ThemedText>
    </View>
  );
}

export function SectionRule({ label }: { label: string }) {
  return (
    <View style={styles.section}>
      <ThemedText style={styles.sectionText}>{label}</ThemedText>
      <View style={styles.sectionLine} />
    </View>
  );
}

export function AvatarStack({ names, size = 26 }: { names: string[]; size?: number }) {
  const shown = names.slice(0, 3);
  if (shown.length === 0) return null;
  return (
    <View style={styles.stack}>
      {shown.map((name, index) => (
        <View key={`${name}-${index}`} style={{ marginLeft: index === 0 ? 0 : -9 }}>
          <PersonAvatar name={name} size={size} />
        </View>
      ))}
    </View>
  );
}

type StoryProps = {
  kicker: string;
  headline: string;
  meta: string;
  imageUrl?: string | null;
  title: string;
  eventOn?: string | null;
  override?: CoverOverride;
  names?: string[];
  onPress?: () => void;
  onChangeCover?: () => void;
  height?: number;
};

/** Cover photo is short. The kicker sits on it. The headline sits underneath. */
export function EditionStory({
  kicker,
  headline,
  meta,
  imageUrl,
  title,
  eventOn,
  override,
  names = [],
  onPress,
  onChangeCover,
  height = 196,
}: StoryProps) {
  const art = (
    <View>
      <View style={{ height, overflow: 'hidden' }}>
        <CoverArt uri={imageUrl} title={title} eventOn={eventOn} override={override} frameHeight={height} />
        <View style={styles.kickerAnchor}>
          <KickerTag label={kicker} />
        </View>
        {onChangeCover ? (
          <NativePressable accessibilityRole="button" accessibilityLabel="Cover, change" onPress={onChangeCover} style={styles.change}>
            <ThemedText style={styles.changeText}>Cover · Change</ThemedText>
          </NativePressable>
        ) : null}
      </View>
      <View style={styles.storyCopy}>
        <HeadlineText text={headline} style={styles.coverHeadline} />
        <View style={styles.metaRow}>
          <ThemedText style={styles.meta}>{meta}</ThemedText>
          <AvatarStack names={names} />
        </View>
      </View>
    </View>
  );
  if (!onPress) return art;
  return (
    <NativePressable accessibilityRole="button" accessibilityLabel={headline.replace(/\*/g, '')} onPress={onPress}>
      {art}
    </NativePressable>
  );
}

export function IssueEntry({
  number,
  headline,
  meta,
  imageUrl,
  title,
  eventOn,
  override,
  names = [],
  onPress,
}: {
  number: string;
  headline: string;
  meta: string;
  imageUrl?: string | null;
  title: string;
  eventOn?: string | null;
  override?: CoverOverride;
  names?: string[];
  onPress?: () => void;
}) {
  const row = (
    <View style={styles.entry}>
      <ThemedText style={styles.numeral}>{number}</ThemedText>
      <View style={styles.entryCopy}>
        <HeadlineText text={headline} style={styles.entryHeadline} />
        <View style={styles.entryMeta}>
          <ThemedText style={styles.entryMetaText} numberOfLines={1}>
            {meta}
          </ThemedText>
          <AvatarStack names={names} size={20} />
        </View>
      </View>
      <View style={styles.thumb}>
        <CoverArt uri={imageUrl} title={title} eventOn={eventOn} override={override} frameHeight={60} thumb />
      </View>
    </View>
  );
  if (!onPress) return row;
  return (
    <NativePressable accessibilityRole="button" accessibilityLabel={headline.replace(/\*/g, '')} onPress={onPress}>
      {row}
    </NativePressable>
  );
}

export function PickEntry({
  number,
  kind,
  title,
  price,
  note,
  imageUrl,
  onPress,
}: {
  number: string;
  kind: 'exact' | 'vibe';
  title: string;
  price?: string | null;
  note?: string | null;
  imageUrl?: string | null;
  onPress?: () => void;
}) {
  const row = (
    <View style={styles.pick}>
      <ThemedText style={styles.pickNum}>{number}</ThemedText>
      <View style={styles.pickPhoto}>
        <CoverArt uri={imageUrl} title={title} frameHeight={60} thumb />
      </View>
      <View style={styles.entryCopy}>
        <ThemedText style={[styles.kind, kind === 'vibe' ? { color: OXBLOOD } : null]}>{kind === 'vibe' ? 'TASTE' : 'EXACT'}</ThemedText>
        <ThemedText style={styles.pickTitle}>{title}</ThemedText>
        {price ? <ThemedText style={styles.meta}>{price}</ThemedText> : null}
        {note ? <ThemedText style={styles.note}>{`“${note}”`}</ThemedText> : null}
      </View>
    </View>
  );
  if (!onPress) return row;
  return (
    <NativePressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={{ minHeight: 44 }}>
      {row}
    </NativePressable>
  );
}

export function CircleButton({ label, onPress, children }: { label: string; onPress: () => void; children: ReactNode }) {
  return (
    <NativePressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.circle}>
      {children}
    </NativePressable>
  );
}

export function screenPad(): StyleProp<ViewStyle> {
  return { paddingBottom: 120 };
}

const styles = StyleSheet.create({
  printGround: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  print: {
    backgroundColor: '#fff',
    transform: [{ rotate: '-4deg' }],
    ...Platform.select({
      web: { boxShadow: '0 12px 26px -10px rgba(40,25,15,.45)' },
      default: {
        shadowColor: '#28190F',
        shadowOpacity: 0.3,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
      },
    }),
  },
  printCover: {
    paddingTop: 7,
    paddingHorizontal: 7,
    paddingBottom: 22,
  },
  printThumb: {
    paddingTop: 3,
    paddingHorizontal: 3,
    paddingBottom: 8,
  },
  printImage: {
    width: 116,
    height: 88,
  },
  printImageThumb: {
    width: 34,
    height: 26,
  },
  letter: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterMark: {
    fontFamily: FontFamilies.serif,
    color: '#FFFFFF',
  },
  kicker: {
    backgroundColor: OXBLOOD,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  kickerText: {
    fontFamily: FontFamilies.sansSemibold,
    color: '#FFFFFF',
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  kickerAnchor: {
    position: 'absolute',
    top: 14,
    left: 20,
  },
  change: {
    position: 'absolute',
    left: 20,
    bottom: 12,
    backgroundColor: 'rgba(251,249,244,0.96)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
    justifyContent: 'center',
  },
  changeText: {
    fontFamily: FontFamilies.sansSemibold,
    fontSize: 12,
    lineHeight: 16,
    color: INK,
  },
  storyCopy: {
    paddingHorizontal: 20,
    paddingTop: 13,
  },
  coverHeadline: {
    fontSize: 44,
    lineHeight: 42,
    letterSpacing: -0.8,
    color: INK,
  },
  metaRow: {
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  meta: {
    flex: 1,
    fontFamily: FontFamilies.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
  },
  sectionText: {
    fontFamily: FontFamilies.sansBold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.6,
    color: INK,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: INK,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    minHeight: 44,
  },
  numeral: {
    fontFamily: FontFamilies.serif,
    fontSize: 28,
    lineHeight: 28,
    color: OXBLOOD,
    width: 34,
  },
  entryCopy: {
    flex: 1,
    minWidth: 0,
  },
  entryHeadline: {
    fontSize: 23,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: INK,
  },
  entryMeta: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  entryMetaText: {
    flexShrink: 1,
    fontFamily: FontFamilies.sansMedium,
    fontSize: 12.5,
    lineHeight: 16,
    color: MUTED,
  },
  thumb: {
    width: 60,
    height: 60,
    overflow: 'hidden',
  },
  pick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  pickNum: {
    fontFamily: FontFamilies.serif,
    fontSize: 26,
    lineHeight: 28,
    color: OXBLOOD,
    width: 28,
  },
  pickPhoto: {
    width: 60,
    height: 60,
    overflow: 'hidden',
  },
  kind: {
    fontFamily: FontFamilies.sansBold,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1.4,
    color: INK,
  },
  pickTitle: {
    fontFamily: FontFamilies.serif,
    fontSize: 21,
    lineHeight: 23,
    color: INK,
    marginTop: 2,
  },
  note: {
    fontFamily: FontFamilies.serifItalic,
    fontSize: 17,
    lineHeight: 20,
    color: MUTED,
    marginTop: 3,
  },
  circle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: RULE,
  },
});
