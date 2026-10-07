import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/themed-text';
import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { StageThumbRadius, StageThumbSize, thumbInitials, thumbPaletteIndex } from '@/lib/stage-home';

const PALETTES = [
  ['#FFE8E4', '#FFF6F4'],
  ['#F0EEEB', '#FAFAFA'],
  ['#FFF3D1', '#FFFCF4'],
] as const;

type StageThumbProps = {
  title?: string | null;
  seed: string;
};

/** Small framed initial. Home never uses a product photo as the hero. */
export function StageThumb({ title, seed }: StageThumbProps) {
  const theme = useTheme();
  const initials = thumbInitials(title);
  const colors = PALETTES[thumbPaletteIndex(seed)];

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.thumb, { borderColor: theme.border }]}
      accessibilityRole="image"
      accessibilityLabel={`${initials} placeholder`}>
      <ThemedText style={[styles.letters, { color: theme.text }]}>{initials}</ThemedText>
    </LinearGradient>
  );
}

export function KindPill({ label }: { label: 'Exact' | 'Taste' }) {
  const theme = useTheme();
  const taste = label === 'Taste';
  return (
    <View
      style={[
        styles.pill,
        {
          backgroundColor: taste ? theme.backgroundElement : theme.brandSoft,
          borderColor: taste ? theme.border : theme.brandSoft,
        },
      ]}>
      <ThemedText type="caption" style={{ color: taste ? theme.textSecondary : theme.brandInk, fontWeight: 600 }}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: {
    width: StageThumbSize,
    height: StageThumbSize,
    borderRadius: StageThumbRadius,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexGrow: 0,
    flexShrink: 0,
  },
  letters: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: 600,
    letterSpacing: 0.4,
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
