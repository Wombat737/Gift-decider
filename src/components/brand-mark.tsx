import { View } from 'react-native';

import { MonogramMark } from '@/components/meantvo-mark';

type BrandMarkProps = {
  size?: number;
};

export function BrandMark({ size = 48 }: BrandMarkProps) {
  return (
    <View accessibilityRole="image" accessibilityLabel="Meantvo" style={{ width: size, height: size }}>
      <MonogramMark size={size} />
    </View>
  );
}
