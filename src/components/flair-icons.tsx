import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { CoralCoast } from '@/constants/coral-coast';

export type FlairIconName = 'add' | 'share' | 'chip-in' | 'lock' | 'bought' | 'payid' | 'gift' | 'nudge';

type FlairIconProps = {
  name: FlairIconName;
  color?: string;
  size?: number;
  active?: boolean;
};

/** 24px lite set — 1.75 stroke, round caps. Monochrome ink; active = coral. */
export function FlairIcon({ name, color, size = 24, active = false }: FlairIconProps) {
  const stroke = color ?? (active ? CoralCoast.brand : CoralCoast.ink);
  const common = {
    stroke,
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no">
      {name === 'add' ? (
        <Path d="M12 5 V19 M5 12 H19" {...common} />
      ) : name === 'share' ? (
        <>
          <Path d="M12 4 V14" {...common} />
          <Path d="M8 8 L12 4 L16 8" {...common} />
          <Path d="M6 12 V19 H18 V12" {...common} />
        </>
      ) : name === 'chip-in' ? (
        <>
          <Circle cx="12" cy="12" r="8" {...common} />
          <Path d="M12 8 V16 M9.5 10.5 H14.5 M9.5 13.5 H14.5" {...common} />
        </>
      ) : name === 'lock' ? (
        <>
          <Rect x="6" y="11" width="12" height="9" rx="2" {...common} />
          <Path d="M8 11 V8 A4 4 0 0 1 16 8 V11" {...common} />
        </>
      ) : name === 'bought' ? (
        <>
          <Circle cx="12" cy="12" r="8" {...common} />
          <Path d="M8.5 12.5 L11 15 L16 9.5" {...common} />
        </>
      ) : name === 'payid' ? (
        <>
          <Rect x="4" y="6" width="16" height="12" rx="2" {...common} />
          <Path d="M4 10 H20" {...common} />
          <Circle cx="8.5" cy="14" r="1.1" fill={stroke} stroke="none" />
        </>
      ) : name === 'gift' ? (
        <>
          <Rect x="5" y="11" width="14" height="8" rx="1.5" {...common} />
          <Path d="M5 11 H19 M12 11 V19" {...common} />
          <Path d="M12 11 C12 7 8 7 8 9.5 C8 11 10 11 12 11" {...common} />
          <Path d="M12 11 C12 7 16 7 16 9.5 C16 11 14 11 12 11" {...common} />
        </>
      ) : (
        <>
          <Path d="M7 17 H17" {...common} />
          <Path d="M9 17 V11 A3 3 0 0 1 15 11 V17" {...common} />
          <Path d="M12 6 V7.5" {...common} />
        </>
      )}
    </Svg>
  );
}
