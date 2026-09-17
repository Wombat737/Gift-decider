import { AccessibilityInfo, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

/**
 * Celebrate haptics. Skip web, reduce-motion, and missing engines.
 * Never call on scroll or mere navigation.
 */
async function shouldSkip() {
  if (Platform.OS === 'web') return true;
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}

/** Purchased flick start + soft-lock toggle. Light tick / PERFORM_EDIT stand-in. */
export async function hapticLight() {
  if (await shouldSkip()) return;
  try {
    if (Platform.OS === 'android') {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Context_Click);
      return;
    }
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Engine off, low power, or web shim — never block the tap.
  }
}

/** Chip-in confirm. Success notification / Android Confirm. */
export async function hapticSuccess() {
  if (await shouldSkip()) return;
  try {
    if (Platform.OS === 'android') {
      await Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm);
      return;
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // same as light — no-op
  }
}
