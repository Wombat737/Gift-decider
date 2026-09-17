import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

function styleBlock(src: string, name: string) {
  const match = src.match(new RegExp(`${name}:\\s*\\{([\\s\\S]*?)\\n  \\},`));
  return match?.[1] ?? '';
}

describe('Native screen layout keeps width bound without clipping giver buttons', () => {
  it('Screen stays viewport-wide so titles wrap, and neither scroll box nor inner flexGrow to the viewport', () => {
    const screen = source('components/screen.tsx');
    const inner = styleBlock(screen, 'inner');
    const scroll = styleBlock(screen, 'scroll');
    const scrollView = styleBlock(screen, 'scrollView');
    const scrollSlot = styleBlock(screen, 'scrollSlot');

    assert.match(scrollView, /width: '100%'/);
    assert.match(scrollView, /maxWidth: '100%'/);
    assert.match(scrollSlot, /minHeight: 0/);
    assert.match(scrollSlot, /flexShrink: 1/);
    assert.match(screen, /styles\.scrollSlot/);
    assert.match(scroll, /width: '100%'/);
    assert.match(scroll, /maxWidth: '100%'/);
    // flexGrow: 1 on the Fabric content container keeps its native frame
    // viewport-tall; overflowing Pressables (every CTA below the gift image)
    // then miss iOS hit testing. Height must follow children.
    assert.match(scroll, /flexGrow: 0/);
    assert.match(scroll, /flexShrink: 0/);
    assert.equal(/flexGrow:\s*1/.test(scroll), false);
    assert.match(inner, /width: '100%'/);
    assert.match(inner, /maxWidth: MaxContentWidth/);
    assert.match(inner, /minWidth: 0/);
    assert.match(inner, /flexGrow: 0/);
    assert.match(inner, /flexShrink: 0/);
    assert.equal(/flexGrow:\s*1/.test(inner), false);
    assert.equal(/overflow:\s*'hidden'/.test(inner), false);
    assert.equal(/overflow:\s*'hidden'/.test(scroll), false);
    assert.match(screen, /keyboardShouldPersistTaps="handled"/);
    assert.match(screen, /keyboardDismissMode=/);
    assert.match(screen, /onScrollBeginDrag=\{Keyboard\.dismiss\}/);
    assert.match(screen, /KeyboardAvoidingView/);
    assert.match(screen, /keyboardVerticalOffset/);
    assert.match(screen, /collapsable=\{false\}/);
    assert.match(screen, /removeClippedSubviews=\{false\}/);
    assert.equal(/keyboardShouldPersistTaps="always"/.test(screen), false);
  });

  it('Button press target stretches so labels cannot collapse the iOS hit box', () => {
    const button = source('components/button.tsx');
    const base = styleBlock(button, 'base');
    assert.match(button, /NativePressable/);
    assert.match(button, /nativePress/);
    assert.match(button, /TouchableOpacity/);
    assert.match(button, /key=\{label\}/);
    assert.match(button, /pointerEvents: 'none'/);
    assert.match(base, /width: '100%'/);
    assert.match(base, /alignSelf: 'stretch'/);
    assert.match(base, /minHeight: 50/);
    assert.match(base, /flexShrink: 0/);
  });

  it('native Pressable uses Gesture Handler so ScrollView offset cannot cancel onPress', () => {
    const pressable = source('components/native-pressable.tsx');
    assert.match(pressable, /react-native-gesture-handler/);
    assert.match(pressable, /Platform\.OS === 'web'/);
    assert.match(pressable, /GHPressable/);
    const button = source('components/button.tsx');
    const card = source('components/item-card.tsx');
    assert.match(button, /NativePressable/);
    assert.match(card, /NativePressable/);
  });

  it('ThemedText does not globally flexShrink (that collapsed Pressable hits on iOS)', () => {
    const text = source('components/themed-text.tsx');
    const base = styleBlock(text, 'base');
    assert.equal(/flexShrink:\s*1/.test(base), false);
    assert.match(base, /maxWidth: '100%'/);
  });

  it('add-gift and share keep the iOS keyboard from covering fields or trapping focus', () => {
    const screen = source('components/screen.tsx');
    const field = source('components/text-field.tsx');
    const add = source('app/(app)/add.tsx');
    const share = source('app/(app)/share.tsx');
    assert.match(add, /<Screen>/);
    assert.match(share, /<Screen>/);
    assert.equal(/footer=/.test(add), false);
    assert.equal(/footer=/.test(share), false);
    // No footer → #16 ScrollView tree (not the giver-only scrollSlot wrap).
    assert.match(
      screen,
      /footer \? <View collapsable=\{false\} style=\{styles\.scrollSlot\}>\{scrollView\}<\/View> : scrollView/,
    );
    assert.match(screen, /KeyboardAvoidingView/);
    assert.match(screen, /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
    assert.match(screen, /keyboardShouldPersistTaps="handled"/);
    assert.match(screen, /onScrollBeginDrag=\{Keyboard\.dismiss\}/);
    assert.match(field, /returnKeyType=\{returnKeyType \?\? \(multiline \? 'default' : 'done'\)\}/);
    assert.match(field, /blurOnSubmit=\{blurOnSubmit \?\? !multiline\}/);
    assert.match(field, /Keyboard\.dismiss\(\)/);
    assert.equal(/flexGrow:\s*1/.test(styleBlock(screen, 'scroll')), false);
    assert.equal(/flexGrow:\s*1/.test(styleBlock(screen, 'inner')), false);
  });

  it('giver detail reads the shared catalog so list chips update with the item screen', () => {
    const itemScreen = source('app/g/[token]/[itemId].tsx');
    const listScreen = source('app/g/[token]/index.tsx');
    assert.match(itemScreen, /useGiverCatalog/);
    assert.match(itemScreen, /pickSharedItem/);
    assert.match(itemScreen, /preferLocalGiverItem/);
    assert.match(itemScreen, /giverStatusActions/);
    assert.equal(/const current = shareItem \?\? item/.test(itemScreen), false);
    assert.match(listScreen, /useGiverCatalog/);
    assert.match(itemScreen, /updateStatus\('reserved'\)/);
    assert.match(itemScreen, /updateStatus\('purchased'\)/);
    assert.match(itemScreen, /updateStatus\('available'\)/);
    assert.match(itemScreen, /pointerEvents="none"/);
  });

  it('giver status CTAs sit in a Screen footer outside ScrollView and use RN Pressable', () => {
    const screen = source('components/screen.tsx');
    const itemScreen = source('app/g/[token]/[itemId].tsx');
    const layout = source('app/_layout.tsx');
    const footerDock = styleBlock(screen, 'footerDock');
    const footerInner = styleBlock(screen, 'footerInner');

    assert.match(screen, /footer\?: ReactNode/);
    assert.match(screen, /footerKey\?: string/);
    assert.match(screen, /\{footer \? \(/);
    assert.match(screen, /styles\.footerDock/);
    assert.match(footerDock, /width: '100%'/);
    assert.match(footerDock, /maxWidth: '100%'/);
    assert.match(footerDock, /zIndex: 2/);
    assert.match(footerDock, /flexShrink: 0/);
    assert.equal(/overflow:\s*'hidden'/.test(footerDock), false);
    assert.match(footerInner, /maxWidth: MaxContentWidth/);
    assert.match(footerInner, /minWidth: 0/);
    assert.match(screen, /key=\{footerKey\}/);
    // Footer is a KeyboardAvoidingView sibling of ScrollView, not a child of it.
    const afterScroll = screen.split('</ScrollView>')[1] ?? '';
    assert.match(afterScroll, /\{footer \? \(/);
    assert.match(afterScroll, /styles\.footerDock/);

    assert.match(itemScreen, /footer=\{/);
    assert.match(itemScreen, /footerKey=\{/);
    assert.match(itemScreen, /nativePress/);
    assert.match(itemScreen, /Keyboard\.dismiss\(\)/);
    assert.match(itemScreen, /styles\.imageFrame/);
    assert.match(styleBlock(itemScreen, 'imageFrame'), /overflow: 'hidden'/);
    assert.match(layout, /GestureHandlerRootView/);
    assert.match(layout, /width: '100%'/);
  });

  it('giver status mutations do not early-return past a live share token', () => {
    const itemScreen = source('app/g/[token]/[itemId].tsx');
    const wishlist = source('services/wishlist.ts');
    assert.match(itemScreen, /if \(!token\) \{\s*setError\('Tap registered — this share link is missing a token\.'\);/);
    assert.match(itemScreen, /Tap registered — live list did not save/);
    assert.match(itemScreen, /commitItem\(await setSharedItemStatus/);
    assert.match(wishlist, /function useDemoShare\(token: string\)/);
    assert.match(wishlist, /shouldUseDemoShare\(token, Boolean\(env\.isSupabaseConfigured && supabase\)\)/);
    assert.match(wishlist, /export async function setSharedItemStatus/);
    assert.equal(/if \(usesDemoData\(\)\) return setDemoItemStatus/.test(wishlist), false);
    const start = wishlist.indexOf('export async function setSharedItemStatus');
    const nextExport = wishlist.indexOf('export async function', start + 1);
    const statusFn = wishlist.slice(start, nextExport);
    assert.match(statusFn, /rpc\('set_shared_item_status'/);
    assert.equal(/await loadSharedGiverExtras/.test(statusFn), false);
    assert.match(statusFn, /applyItemStatus\(base, status, reservedBy\)/);
  });
});
