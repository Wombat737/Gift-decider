import { type NativeStackNavigationOptions } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { leaveScreen } from '@/lib/leave-screen';

/** Always-on header exit. Native back hides when this screen is the stack root. */
export function StackExitButton() {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={() => leaveScreen()}
      hitSlop={8}
      style={styles.hit}>
      <ThemedText type="bodyEm" style={{ color: theme.text }}>
        Back
      </ThemedText>
    </Pressable>
  );
}

export function exitHeaderOptions(): NativeStackNavigationOptions {
  return {
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
    headerBackButtonDisplayMode: 'minimal',
    // Custom Back replaces the native chevron so a root screen still has an exit.
    headerBackVisible: false,
    headerLeft: () => <StackExitButton />,
    unstable_headerLeftItems: () => [
      {
        type: 'button',
        label: 'Back',
        icon: { type: 'sfSymbol', name: 'chevron.backward' },
        onPress: () => leaveScreen(),
      },
    ],
  };
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
