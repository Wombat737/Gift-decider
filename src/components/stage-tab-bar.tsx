import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlairIcon, type FlairIconName } from '@/components/flair-icons';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useInbox } from '@/context/inbox-context';
import { useTheme } from '@/hooks/use-theme';
import { track } from '@/lib/analytics';
import { badgeCountLabel } from '@/lib/inbox';
import { editionTabSelected, type EditionTab } from '@/lib/stage-home';

const TABS: { id: EditionTab; label: string; icon: FlairIconName }[] = [
  { id: 'lists', label: 'Lists', icon: 'lists' },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

export function EditionTopTabs({ pathname }: { pathname: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ find?: string | string[] }>();
  const find = (Array.isArray(params.find) ? params.find[0] : params.find) === '1';
  const { pendingRequests, newlyReady } = useInbox();
  const selected = editionTabSelected(pathname, find);
  const settingsBadge = badgeCountLabel(pendingRequests + newlyReady.length);

  return (
    <View
      style={[
        styles.top,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
          paddingTop: Math.max(insets.top, Spacing.two),
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
            accessibilityLabel={tab.id === 'settings' && settingsBadge ? `Settings, ${settingsBadge} new` : tab.label}
            onPress={() => openTab(tab.id, active)}
            style={styles.hit}>
            <FlairIcon name={tab.icon} color={color} size={22} />
            {tab.id === 'settings' && settingsBadge ? (
              <View style={[styles.badge, { backgroundColor: theme.brand }]}>
                <ThemedText type="caption" style={[styles.badgeText, { color: theme.brandText }]}>
                  {settingsBadge}
                </ThemedText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function openTab(id: EditionTab, active: boolean) {
  if (active) return;
  if (id === 'lists') {
    router.dismissTo('/wishlist');
    return;
  }
  if (id === 'people') {
    router.navigate('/people');
    return;
  }
  if (id === 'search') {
    router.navigate('/people?find=1');
    return;
  }
  track('settings_opened', { source: 'edition_tab' });
  router.navigate('/settings');
}

/** Floating bar. The oxblood plus is the only primary action. */
export function EditionPlusBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, Spacing.two) }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a pick"
          onPress={() => router.navigate('/add')}
          style={[styles.plus, { backgroundColor: theme.brand }]}>
          <FlairIcon name="add" color={theme.brandText} size={28} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    width: '100%',
    flexDirection: 'row',
    borderBottomWidth: 1,
    flexGrow: 0,
    flexShrink: 0,
  },
  hit: {
    flex: 1,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: '28%',
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
  },
  dock: {
    width: '100%',
    alignItems: 'center',
    flexGrow: 0,
    flexShrink: 0,
  },
  bar: {
    marginBottom: Spacing.two,
    borderRadius: 999,
    borderWidth: 1,
    padding: Spacing.two,
  },
  plus: {
    width: 64,
    height: 64,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
});
