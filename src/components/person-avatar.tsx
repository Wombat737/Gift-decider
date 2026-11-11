import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontFamilies } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { thumbInitials } from '@/lib/stage-home';

type PersonAvatarProps = {
  name?: string | null;
  uri?: string | null;
  size?: number;
};

/** Profile photo, or initials on stone when there isn’t one. */
export function PersonAvatar({ name, uri, size = 36 }: PersonAvatarProps) {
  const theme = useTheme();
  const photo = (uri ?? '').trim();
  const letters = thumbInitials(name || 'Friend');

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={photo ? `${name || 'Person'} photo` : `${letters} initials`}
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.stone,
          borderColor: theme.border,
        },
      ]}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.image} contentFit="cover" />
      ) : (
        <ThemedText style={[styles.letters, { color: theme.brand, fontSize: Math.max(12, size * 0.36) }]}>
          {letters}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexGrow: 0,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  letters: {
    fontFamily: FontFamilies.serif,
    lineHeight: undefined,
  },
});
