import { forwardRef } from 'react';
import { Platform, Pressable as RNPressable, type PressableProps, type View } from 'react-native';
import { Pressable as GHPressable } from 'react-native-gesture-handler';

/**
 * RN Pressable on Fabric builds the press rect from JS measure(). After a
 * Screen ScrollView pans — the square gift image fills the first viewport, so
 * every CTA is below the fold — that rect is stale and onPress is cancelled
 * even though the native hit test succeeded. Gesture Handler hit-tests the
 * mounted view, so primary buttons still fire on iOS TestFlight.
 */
export const NativePressable = forwardRef<View, PressableProps>(function NativePressable(props, ref) {
  if (Platform.OS === 'web') {
    return <RNPressable ref={ref} {...props} />;
  }
  // GH Pressable hit-tests the mounted view. Its hover event types disagree
  // with RN PressableProps; the runtime API is the same for onPress/style.
  return <GHPressable ref={ref as never} {...(props as object as Record<string, unknown>)} />;
});
