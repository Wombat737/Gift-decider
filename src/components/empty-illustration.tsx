import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { CoralCoast } from '@/constants/coral-coast';
import { IlluSize } from '@/constants/theme';

export type EmptyIllustrationKind = 'owner' | 'giver' | 'invites';

type EmptyIllustrationProps = {
  kind: EmptyIllustrationKind;
  size?: number;
};

/** Bold flat Coral Coast empties — 2–3 colours, no SVG gradients. */
export function EmptyIllustration({ kind, size = IlluSize }: EmptyIllustrationProps) {
  const tilt = kind === 'owner' ? '2deg' : kind === 'giver' ? '-2deg' : '0deg';

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={
        kind === 'owner' ? 'Open gift box' : kind === 'giver' ? 'Shopping bag' : 'Envelope'
      }
      style={[styles.wrap, { width: size, height: size, transform: [{ rotate: tilt }] }]}>
      {kind === 'owner' ? <OwnerGiftBox size={size} /> : null}
      {kind === 'giver' ? <GiverBag size={size} /> : null}
      {kind === 'invites' ? <InviteEnvelope size={size} /> : null}
    </View>
  );
}

function OwnerGiftBox({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="38" y="82" width="84" height="48" rx="8" fill={CoralCoast.brand} />
      <Rect x="70" y="82" width="20" height="48" fill={CoralCoast.accent} />
      <Rect x="30" y="64" width="100" height="20" rx="6" fill={CoralCoast.ink} />
      <Rect x="70" y="64" width="20" height="20" fill={CoralCoast.accent} />
      <Path
        d="M80 64 C80 42 108 40 108 56 C108 68 88 70 80 82"
        fill="none"
        stroke={CoralCoast.brand}
        strokeWidth={8}
        strokeLinecap="round"
      />
      <Path
        d="M80 64 C80 42 52 40 52 56 C52 68 72 70 80 82"
        fill="none"
        stroke={CoralCoast.brand}
        strokeWidth={8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function GiverBag({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Path d="M50 62 L56 132 H104 L110 62 Z" fill={CoralCoast.brand} />
      <Path
        d="M64 62 C64 40 96 40 96 62"
        fill="none"
        stroke={CoralCoast.ink}
        strokeWidth={7}
        strokeLinecap="round"
      />
      <Rect x="50" y="56" width="60" height="12" rx="4" fill={CoralCoast.ink} />
      <Circle cx="118" cy="50" r="20" fill={CoralCoast.accent} />
      <Circle cx="118" cy="50" r="20" fill="none" stroke={CoralCoast.ink} strokeWidth={3} />
      <Circle cx="118" cy="50" r="8" fill="none" stroke={CoralCoast.ink} strokeWidth={3} />
    </Svg>
  );
}

function InviteEnvelope({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 160 160">
      <Rect x="28" y="52" width="104" height="68" rx="10" fill={CoralCoast.accent} />
      <Path
        d="M28 62 L80 102 L132 62"
        fill="none"
        stroke={CoralCoast.ink}
        strokeWidth={6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="118" cy="48" r="12" fill={CoralCoast.brand} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
