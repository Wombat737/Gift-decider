import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { FlairIcon } from '@/components/flair-icons';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { isUnsafeImageUri, looksLikeImageUri } from '@/lib/item-image';
import { isWishlistImagesUrl } from '@/lib/link-preview';

type GiftPhotoProps = {
  uri?: string | null;
  /** Shown only when `uri` is empty (item detail empty art). Broken URLs stay quiet. */
  missingUri?: string | null;
  /** Shop page, sent as Referer so some CDNs allow the product photo. */
  referrer?: string | null;
  aspectRatio?: number;
  style?: StyleProp<ViewStyle>;
  /** Return true when a fallback URL was applied and the error should not stick. */
  onLoadError?: () => boolean;
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
export function GiftPhoto({ uri, missingUri, referrer, aspectRatio = 1, style, onLoadError }: GiftPhotoProps) {
  const theme = useTheme();
  const shown = displayUri(uri, missingUri);
  const [failed, setFailed] = useState(false);
  // Web expo-image fetches when `headers` is set, and that CORS-fails most shop CDNs.
  // A plain <img> still paints the remote photo. Native can send Referer.
  const sendReferrer =
    Platform.OS !== 'web' &&
    Boolean(referrer) &&
    Boolean(shown) &&
    /^https?:/i.test(shown ?? '') &&
    !isWishlistImagesUrl(shown ?? '');

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
        source={sendReferrer ? { uri: shown, headers: { Referer: referrer ?? '' } } : { uri: shown }}
        style={styles.image}
        contentFit="cover"
        pointerEvents="none"
        recyclingKey={shown}
        onError={() => {
          const recovered = onLoadError?.() ?? false;
          if (!recovered) setFailed(true);
        }}
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
