import { router } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlairIcon, type FlairIconName } from '@/components/flair-icons';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useInbox } from '@/context/inbox-context';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { badgeCountLabel } from '@/lib/inbox';
import { stageTabSelected } from '@/lib/stage-home';

const TABS: { id: 'home' | 'add' | 'me'; label: string; href: '/wishlist' | '/add' | '/settings'; icon: FlairIconName }[] =
  [
    { id: 'home', label: 'Home', href: '/wishlist', icon: 'home' },
    { id: 'add', label: 'Add', href: '/add', icon: 'add' },
    { id: 'me', label: 'Me', href: '/settings', icon: 'me' },
  ];

export function StageTabBar({ pathname }: { pathname: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { pendingRequests, newlyReady } = useInbox();
  const selected = stageTabSelected(pathname);
  const meBadge = badgeCountLabel(pendingRequests + newlyReady.length);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.two),
        },
      ]}>
      {TABS.map((tab) => {
        const active = selected === tab.id;
        const color = active ? theme.brand : theme.textSecondary;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.id === 'me' && meBadge ? `Me, ${meBadge} new` : tab.label}
            onPress={() => {
              if (active) return;
              if (tab.id === 'me') track('settings_opened', { source: 'stage_tab' });
              router.replace(tab.href);
            }}
            style={styles.tab}>
            <View>
              <FlairIcon name={tab.icon} color={color} size={22} />
              {tab.id === 'me' && meBadge ? (
                <View style={[styles.badge, { backgroundColor: theme.brand }]}>
                  <ThemedText type="caption" style={[styles.badgeText, { color: theme.brandText }]}>
                    {meBadge}
                  </ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText type="caption" style={{ color, fontWeight: 600 }}>
              {tab.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: '100%',
    maxWidth: '100%',
    flexDirection: 'row',
    borderTopWidth: 1,
    flexGrow: 0,
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: 700,
  },
});
