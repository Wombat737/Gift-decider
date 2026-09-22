import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repo = join(root, '..');

function source(rel: string) {
  return readFileSync(join(root, rel), 'utf8');
}

describe('iOS cold open matches the pre-share host', () => {
  it('does not install expo-sharing or run a share hook at startup', () => {
    const pkg = JSON.parse(readFileSync(join(repo, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      expo?: unknown;
    };
    assert.equal(pkg.dependencies?.['expo-sharing'], undefined);
    assert.equal(pkg.devDependencies?.['expo-sharing'], undefined);
    assert.equal(pkg.expo, undefined);

    const appJson = readFileSync(join(repo, 'app.json'), 'utf8');
    assert.equal(appJson.includes('expo-sharing'), false);
    assert.equal(appJson.includes('application-groups'), false);
    assert.equal(appJson.includes('with-share-display-name'), false);

    const appConfig = readFileSync(join(repo, 'app.config.js'), 'utf8');
    assert.equal(/expo-sharing|application-groups|IOS_SHARE_EXTENSION/.test(appConfig), false);

    const require = createRequire(import.meta.url);
    const resolved = require(join(repo, 'app.config.js')) as {
      expo: { plugins: unknown[]; ios?: { entitlements?: Record<string, unknown> } };
    };
    const plugins = resolved.expo.plugins.map((entry) => (Array.isArray(entry) ? entry[0] : entry));
    assert.deepEqual(plugins, ['expo-router', 'expo-sqlite', 'expo-image-picker', 'expo-splash-screen']);
    assert.equal(resolved.expo.ios?.entitlements, undefined);

    for (const rel of [
      'src/app/+native-intent.ts',
      'src/lib/share-intent.ts',
      'src/lib/read-share-payload.ts',
      'src/lib/read-share-payload.ios.ts',
      'plugins/with-share-display-name.js',
      'plugins/without-ios-share-native.js',
    ]) {
      assert.equal(existsSync(join(repo, rel)), false, rel);
    }

    const layout = source('app/_layout.tsx');
    assert.equal(layout.includes('stashNativeShare'), false);
    assert.equal(layout.includes('share-intent'), false);
    assert.equal(layout.includes('getInitialURL'), false);
    assert.equal(layout.includes('isLoading || !!user'), false);
    assert.match(layout, /guard=\{!!user\}/);
    assert.match(layout, /guard=\{!user\}/);

    const index = source('app/index.tsx');
    assert.equal(index.includes('share-intent'), false);
    assert.match(index, /Redirect href="\/wishlist"/);
    assert.match(index, /Redirect href="\/sign-in"/);

    assert.equal(source('app/sign-in.tsx').includes('hasPendingShare'), false);
    assert.equal(source('app/auth/callback.tsx').includes('hasPendingShare'), false);

    const add = source('app/(app)/add.tsx');
    assert.match(add, /autofillBuyUrl/);
    assert.equal(add.includes('share-intent'), false);
    assert.equal(add.includes('expo-sharing'), false);
    assert.equal(add.includes('sharedPhoto'), false);

    const photo = source('components/photo-field.tsx');
    assert.match(photo, /pickGiftPhoto/);
    assert.match(photo, /uploadGiftPhoto/);
    assert.equal(photo.includes('sharedPhoto'), false);
    assert.equal(photo.includes('share-intent'), false);

    const readme = readFileSync(join(repo, 'README.md'), 'utf8');
    assert.match(readme, /build 34/);
    assert.match(readme, /Delete Gift Decider/);
    assert.match(readme, /ad053b3/);
  });
});
