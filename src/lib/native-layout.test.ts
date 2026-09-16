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
  it('Screen stays viewport-wide so titles wrap, but inner does not flexGrow to the viewport', () => {
    const screen = source('components/screen.tsx');
    const inner = styleBlock(screen, 'inner');
    const scroll = styleBlock(screen, 'scroll');
    const scrollView = styleBlock(screen, 'scrollView');

    assert.match(scrollView, /width: '100%'/);
    assert.match(scrollView, /maxWidth: '100%'/);
    assert.match(scroll, /width: '100%'/);
    assert.match(scroll, /maxWidth: '100%'/);
    assert.match(scroll, /flexGrow: 1/);
    assert.match(inner, /width: '100%'/);
    assert.match(inner, /maxWidth: MaxContentWidth/);
    assert.match(inner, /minWidth: 0/);
    assert.equal(/flexGrow:\s*1/.test(inner), false);
    assert.equal(/overflow:\s*'hidden'/.test(inner), false);
    assert.match(screen, /keyboardShouldPersistTaps="always"/);
  });

  it('Button press target stretches so labels cannot collapse the iOS hit box', () => {
    const button = source('components/button.tsx');
    const base = styleBlock(button, 'base');
    assert.match(base, /width: '100%'/);
    assert.match(base, /alignSelf: 'stretch'/);
    assert.match(base, /minHeight: 50/);
  });

  it('ThemedText does not globally flexShrink (that collapsed Pressable hits on iOS)', () => {
    const text = source('components/themed-text.tsx');
    const base = styleBlock(text, 'base');
    assert.equal(/flexShrink:\s*1/.test(base), false);
    assert.match(base, /maxWidth: '100%'/);
  });

  it('giver detail reads the shared catalog so list chips update with the item screen', () => {
    const itemScreen = source('app/g/[token]/[itemId].tsx');
    const listScreen = source('app/g/[token]/index.tsx');
    assert.match(itemScreen, /useGiverCatalog/);
    assert.match(itemScreen, /pickSharedItem/);
    assert.match(listScreen, /useGiverCatalog/);
    assert.match(itemScreen, /updateStatus\('reserved'\)/);
    assert.match(itemScreen, /updateStatus\('purchased'\)/);
    assert.match(itemScreen, /updateStatus\('available'\)/);
  });
});
