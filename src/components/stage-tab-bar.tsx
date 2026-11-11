import { router, usePathname } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlairIcon, type FlairIconName } from '@/components/flair-icons';
import { ICON, INK, OXBLOOD, PAPER, CARD, RULE } from '@/components/edition-layout';
import { useInbox } from '@/context/inbox-context';
import { track } from '@/lib/analytics';
import { editionTabSelected, type EditionTab } from '@/lib/stage-home';

const TABS: { id: EditionTab; label: string; icon: FlairIconName }[] = [
  { id: 'lists', label: 'Lists', icon: 'gift' },
  { id: 'people', label: 'People', icon: 'people' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

/** Icon row under the masthead. Oxblood underline on the active tab. */
export function EditionIconTabs({ pathname, find = false }: { pathname: string; find?: boolean }) {
  const selected = editionTabSelected(pathname, find);
  return (
    <View style={styles.tabsWrap}>
      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = selected === tab.id;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={tab.label}
              onPress={() => openTab(tab.id, active)}
              style={styles.tab}>
              <FlairIcon name={tab.icon} color={active ? INK : ICON} size={22} />
              {active ? <View style={styles.underline} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function openTab(id: EditionTab, active: boolean) {
  if (active && id !== 'search') return;
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

/** Card dock. The oxblood + sits proud of the row. */
export function EditionDock({
  onShare,
}: {
  onShare?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { pendingRequests } = useInbox();
  const home = pathname.replace(/\/$/, '') === '/wishlist' || pathname === '/';

  return (
    <View pointerEvents="box-none" style={[styles.dockWrap, { paddingBottom: Math.max(insets.bottom, 18) }]}>
      <View style={styles.dock}>
        <DockIcon label="Lists" active={home} icon="home" onPress={() => router.dismissTo('/wishlist')} />
        <DockIcon
          label={pendingRequests ? `Requests, ${pendingRequests} new` : 'Requests'}
          icon="bell"
          onPress={() => router.navigate('/requests')}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a pick"
          onPress={() => router.navigate('/add')}
          style={styles.plus}>
          <FlairIcon name="add" color="#FFFFFF" size={28} />
        </Pressable>
        <DockIcon label="People" icon="chat" onPress={() => router.navigate('/people')} />
        <DockIcon label="Share" icon="share" onPress={() => (onShare ? onShare() : router.navigate('/share'))} />
      </View>
    </View>
  );
}

function DockIcon({
  label,
  icon,
  onPress,
  active = false,
}: {
  label: string;
  icon: FlairIconName;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.dockHit}>
      <FlairIcon name={icon} color={active ? INK : ICON} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tabsWrap: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  tabs: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: INK,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
  },
  tab: {
    flex: 1,
    height: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  underline: {
    position: 'absolute',
    bottom: -1,
    width: 30,
    height: 2,
    backgroundColor: OXBLOOD,
  },
  dockWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  dock: {
    width: '100%',
    maxWidth: 520,
    height: 60,
    borderRadius: 30,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: RULE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    ...Platform.select({
      web: { boxShadow: '0 14px 30px -14px rgba(40,30,20,.35)' },
      default: {
        shadowColor: '#281E14',
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 10 },
      },
    }),
  },
  dockHit: {
    width: 46,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
  plus: {
    width: 66,
    height: 66,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 33,
    backgroundColor: OXBLOOD,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    borderWidth: 5,
    borderColor: PAPER,
    ...Platform.select({ web: { cursor: 'pointer' as const } }),
  },
});
