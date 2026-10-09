import { router, usePathname } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useInbox } from '@/context/inbox-context';
import { useTheme } from '@/hooks/use-theme';
import { badgeCountLabel } from '@/lib/inbox';
import { personFirstLabel } from '@/lib/list-title';
import { stageBarActive, stageGreeting } from '@/lib/stage-home';
import { getOwnProfile } from '@/services/profile';

const LINKS = [
  { id: 'people' as const, label: 'People', href: '/people' as const },
  { id: 'requests' as const, label: 'Requests', href: '/requests' as const },
  { id: 'settings' as const, label: 'Settings', href: '/settings' as const },
];

/** Greeting, list title, and People / Requests / Settings. Stays pinned above the scroll. */
export function StageStickyHeader({ title }: { title: string }) {
  const theme = useTheme();
  const pathname = usePathname();
  const { user } = useAuth();
  const { pendingRequests, newlyReady } = useInbox();
  const [name, setName] = useState<string | null>(null);
  const active = stageBarActive(pathname);
  const counts: Record<(typeof LINKS)[number]['id'], number> = {
    people: newlyReady.length,
    requests: pendingRequests,
    settings: 0,
  };

  useEffect(() => {
    let cancelled = false;
    void getOwnProfile()
      .then((profile) => {
        if (!cancelled) setName(personFirstLabel(profile?.display_name, profile?.handle));
      })
      .catch(() => {
        if (!cancelled) setName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <View style={styles.wrap}>
      <ThemedText themeColor="textSecondary">{stageGreeting(name)}</ThemedText>
      <ThemedText type="display" accessibilityRole="header" style={styles.title}>
        {title}
      </ThemedText>
      <View style={styles.bar}>
        {LINKS.map((link) => {
          const on = active === link.id;
          const count = counts[link.id];
          const badge = badgeCountLabel(count);
          return (
            <NativePressable
              key={link.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              accessibilityLabel={badge ? `${link.label}, ${count} new` : link.label}
              onPress={() => {
                if (on) return;
                if (!user) {
                  router.push('/sign-in');
                  return;
                }
                router.push(link.href);
              }}
              style={[styles.hit, { backgroundColor: on ? theme.brandSoft : 'transparent' }]}>
              <ThemedText type="smallBold" style={{ color: on ? theme.brandInk : theme.textSecondary }}>
                {link.label}
              </ThemedText>
              {badge ? (
                <View style={[styles.badge, { backgroundColor: theme.brand }]}>
                  <ThemedText type="caption" style={[styles.badgeText, { color: theme.brandText }]}>
                    {badge}
                  </ThemedText>
                </View>
              ) : null}
            </NativePressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    gap: Spacing.one,
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.one,
  },
  hit: {
    flex: 1,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: 700,
  },
});
