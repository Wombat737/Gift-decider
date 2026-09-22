const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BANNED = [
  'expo-sharing',
  'ExpoSharing',
  'ShareExtension',
  'expo-sharing-extension',
  'com.apple.security.application-groups',
  'group.com.giftdecider.app',
  'ExpoShareIntoAppGroupId',
  'NSExtension',
];

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'Pods' || entry.name === 'build' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (predicate(entry.name, full)) out.push(full);
  }
  return out;
}

function nativeTargetNames(pbx) {
  return [...pbx.matchAll(/isa = PBXNativeTarget;[\s\S]*?name = ([^;]+);/g)].map((match) =>
    match[1].replace(/"/g, '').trim(),
  );
}

function assertPackageGone() {
  const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  if (deps['expo-sharing']) {
    throw new Error('package.json still depends on expo-sharing. Remove the package. An autolinking exclude is not enough.');
  }
  if (pkg.expo?.autolinking) {
    throw new Error('package.json still has an autolinking block. Build 28 did not. Delete it.');
  }
  const appJson = fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8');
  if (appJson.includes('expo-sharing') || appJson.includes('application-groups')) {
    throw new Error('app.json still names expo-sharing or an App Group.');
  }
  const configPath = path.join(process.cwd(), 'app.config.js');
  const configSource = fs.readFileSync(configPath, 'utf8');
  if (/expo-sharing|application-groups|with-share|without-ios-share/.test(configSource)) {
    throw new Error('app.config.js still mentions the share extension.');
  }
  const resolved = require(configPath);
  const plugins = JSON.stringify(resolved.expo?.plugins ?? []);
  if (plugins.includes('expo-sharing') || plugins.includes('share')) {
    throw new Error(`Resolved plugins are not the build 28 list: ${plugins}`);
  }
  const entitlements = resolved.expo?.ios?.entitlements;
  if (entitlements && Object.keys(entitlements).length > 0) {
    throw new Error(`app config ios.entitlements is not empty: ${JSON.stringify(entitlements)}`);
  }
  for (const rel of ['src/app/+native-intent.ts', 'src/lib/read-share-payload.ts', 'src/lib/read-share-payload.ios.ts', 'plugins/with-share-display-name.js', 'plugins/without-ios-share-native.js']) {
    if (fs.existsSync(path.join(process.cwd(), rel))) {
      throw new Error(`${rel} is still in the tree. It runs or patches native iOS.`);
    }
  }
}

function assertIosHost(iosRoot) {
  const projects = walk(iosRoot, (name) => name.endsWith('.pbxproj'));
  if (projects.length === 0) {
    throw new Error(`No Xcode project under ${iosRoot}. Run npx expo prebuild --platform ios --no-install --clean`);
  }
  for (const file of projects) {
    const pbx = fs.readFileSync(file, 'utf8');
    const names = nativeTargetNames(pbx);
    const rel = path.relative(iosRoot, file);
    if (names.length !== 1) {
      throw new Error(`${rel} has ${names.length} native targets (${names.join(', ')}). The host must have one.`);
    }
    if (pbx.includes('.appex') || pbx.includes('com.apple.product-type.app-extension')) {
      throw new Error(`${rel} still embeds an app extension.`);
    }
    for (const token of BANNED) {
      if (pbx.includes(token)) throw new Error(`${rel} still contains ${token}.`);
    }
  }

  const entitlements = walk(iosRoot, (name) => name.endsWith('.entitlements'));
  if (entitlements.length === 0) {
    throw new Error(`No entitlements plist under ${iosRoot}.`);
  }
  for (const file of entitlements) {
    const xml = fs.readFileSync(file, 'utf8');
    const rel = path.relative(iosRoot, file);
    if (/<key>/.test(xml)) {
      throw new Error(`${rel} is not an empty entitlements dict.`);
    }
    if (!/<dict\s*\/>/.test(xml) && !/<dict>\s*<\/dict>/.test(xml)) {
      throw new Error(`${rel} has no empty <dict>.`);
    }
    for (const token of BANNED) {
      if (xml.includes(token)) throw new Error(`${rel} still contains ${token}.`);
    }
  }

  const textFiles = walk(iosRoot, (name) => !name.endsWith('.png') && !name.endsWith('.jpg'));
  for (const file of textFiles) {
    const text = fs.readFileSync(file, 'utf8');
    for (const token of BANNED) {
      if (text.includes(token)) {
        throw new Error(`${path.relative(iosRoot, file)} still contains ${token}.`);
      }
    }
  }
}

function readAutolinking(platform) {
  const stdout = execFileSync(
    'npx',
    ['expo-modules-autolinking', 'resolve', '--platform', platform, '--json'],
    { encoding: 'utf8' },
  );
  const start = stdout.indexOf('{');
  if (start < 0) throw new Error(`expo-modules-autolinking resolve --platform ${platform} did not return JSON.`);
  const parsed = JSON.parse(stdout.slice(start));
  return (parsed.modules ?? []).map((mod) => mod.packageName);
}

function assertSharingUnlinked() {
  for (const platform of ['apple', 'android']) {
    const names = readAutolinking(platform);
    if (names.includes('expo-sharing')) {
      throw new Error(`expo-sharing is still autolinked on ${platform}.`);
    }
  }
}

if (require.main === module) {
  assertPackageGone();
  assertIosHost(path.join(process.cwd(), 'ios'));
  assertSharingUnlinked();
  console.log('PASS one iOS target, empty entitlements, expo-sharing not installed and not autolinked');
}

module.exports = {
  assertPackageGone,
  assertIosHost,
  assertSharingUnlinked,
};
