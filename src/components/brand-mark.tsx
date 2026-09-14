import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 48 }: BrandMarkProps) {
  const theme = useTheme();
  const radius = Math.round(size * 0.28);
  const fontSize = Math.round(size * 0.42);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Gift Decider"
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: theme.accent,
        },
      ]}>
      <ThemedText style={{ color: theme.accentText, fontSize, lineHeight: fontSize + 4, fontWeight: 700 }}>
        G
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
