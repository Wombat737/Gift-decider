import { useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { NativePressable } from '@/components/native-pressable';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { GIVER_LIST_SORTS, type GiverListSort } from '@/lib/giver-list';

type GiverListControlsProps = {
  sort: GiverListSort;
  availableOnly: boolean;
  onSort: (sort: GiverListSort) => void;
  onAvailableOnly: (next: boolean) => void;
};

/** One Sort chip and one Available only chip. The menu carries the three orders. */
export function GiverListControls({ sort, availableOnly, onSort, onAvailableOnly }: GiverListControlsProps) {
  const theme = useTheme();
  const anchor = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ x: number; y: number }>({ x: Spacing.four, y: 120 });
  const current = GIVER_LIST_SORTS.find((option) => option.id === sort) ?? GIVER_LIST_SORTS[0];
  const sortActive = sort !== 'recommended';

  function toggleMenu() {
    if (open) {
      setOpen(false);
      return;
    }
    const node = anchor.current;
    if (!node) {
      setOpen(true);
      return;
    }
    node.measureInWindow((x, y, _width, height) => {
      setOrigin({ x, y: y + height + Spacing.one });
      setOpen(true);
    });
  }

  return (
    <View style={styles.row} accessibilityLabel="Sort and filter">
      <View ref={anchor} collapsable={false}>
        <NativePressable
          accessibilityRole="button"
          accessibilityLabel={`Sort, ${current.label}`}
          accessibilityState={{ expanded: open }}
          onPress={toggleMenu}
          style={[
            styles.hit,
            {
              backgroundColor: sortActive ? theme.text : theme.backgroundElement,
              borderColor: sortActive ? theme.text : theme.border,
            },
          ]}>
          <ThemedText
            type="caption"
            numberOfLines={1}
            style={{ color: sortActive ? theme.backgroundElement : theme.text, fontWeight: 600 }}>
            {`Sort · ${current.label}`}
          </ThemedText>
        </NativePressable>
      </View>
      <NativePressable
        accessibilityRole="switch"
        accessibilityLabel="Available only"
        accessibilityState={{ checked: availableOnly }}
        onPress={() => onAvailableOnly(!availableOnly)}
        style={[
          styles.hit,
          {
            backgroundColor: availableOnly ? theme.text : theme.backgroundElement,
            borderColor: availableOnly ? theme.text : theme.border,
          },
        ]}>
        <ThemedText
          type="caption"
          numberOfLines={1}
          style={{ color: availableOnly ? theme.backgroundElement : theme.text, fontWeight: 600 }}>
          Available only
        </ThemedText>
      </NativePressable>
      <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <Pressable
            accessibilityLabel="Close sort"
            style={StyleSheet.absoluteFill}
            onPress={() => setOpen(false)}
          />
          <View
            style={[
              styles.menu,
              {
                top: origin.y,
                left: origin.x,
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}>
            {GIVER_LIST_SORTS.map((option) => {
              const selected = option.id === sort;
              return (
                <NativePressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSort(option.id);
                    setOpen(false);
                  }}
                  style={[styles.option, selected ? { backgroundColor: theme.paper } : null]}>
                  <ThemedText type="body" style={{ fontWeight: selected ? 700 : 500 }}>
                    {option.label}
                  </ThemedText>
                  {selected ? (
                    <ThemedText type="caption" style={{ fontWeight: 700 }}>
                      ✓
                    </ThemedText>
                  ) : (
                    <View style={styles.checkGap} />
                  )}
                </NativePressable>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  hit: {
    minHeight: 44,
    flexGrow: 0,
    flexShrink: 1,
    borderRadius: Radius.pill,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    minWidth: 196,
    borderRadius: Radius.button,
    borderWidth: 1,
    paddingVertical: Spacing.one,
  },
  option: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  checkGap: {
    width: 12,
  },
});
