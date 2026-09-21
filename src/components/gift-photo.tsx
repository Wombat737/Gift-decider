import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { FlairIcon } from '@/components/flair-icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isUnsafeImageUri, looksLikeImageUri } from '@/lib/item-image';

type GiftPhotoProps = {
  uri?: string | null;
  /** Shown only when `uri` is empty (item detail empty art). Broken URLs stay quiet. */
  missingUri?: string | null;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
};

function displayUri(uri?: string | null, missingUri?: string | null) {
  const trimmed = uri?.trim() ?? '';
  if (trimmed) {
    if (isUnsafeImageUri(trimmed) || !looksLikeImageUri(trimmed)) return null;
    return trimmed;
  }
  const fallback = missingUri?.trim() ?? '';
  return fallback || null;
}

/** Live preview. Broken URL → paper + icon, never a crash. */
export function GiftPhoto({ uri, missingUri, aspectRatio = 1, style }: GiftPhotoProps) {
  const theme = useTheme();
  const shown = displayUri(uri, missingUri);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [shown]);

  if (!shown || failed) {
    return (
      <View
        accessibilityRole="image"
        accessibilityLabel={failed ? 'Photo unavailable' : 'No photo yet'}
        style={[
          styles.frame,
          { backgroundColor: theme.paper, aspectRatio },
          style,
        ]}>
        <FlairIcon name="photo" color={theme.textSecondary} />
      </View>
    );
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Gift photo preview"
      collapsable={false}
      pointerEvents="none"
      style={[styles.frame, { backgroundColor: theme.paper, aspectRatio }, style]}>
      <Image
        source={{ uri: shown }}
        style={styles.image}
        contentFit="cover"
        pointerEvents="none"
        recyclingKey={shown}
        onError={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  image: {
    ...StyleSheet.absoluteFill,
  },
});
