const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const APP_GROUP_ENTITLEMENT = 'com.apple.security.application-groups';
const APP_GROUP_ID = 'group.com.giftdecider.app';
const SHARE_INFO_KEY = 'ExpoShareIntoAppGroupId';

function walk(dir, suffix, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'Pods' || entry.name === 'build') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, suffix, out);
    else if (entry.name.endsWith(suffix)) out.push(full);
  }
  return out;
}

function nativeTargetNames(pbx) {
  return [...pbx.matchAll(/isa = PBXNativeTarget;[\s\S]*?name = ([^;]+);/g)].map((match) =>
    match[1].replace(/"/g, '').trim(),
  );
}

function assertIosHost(iosRoot) {
  const projects = walk(iosRoot, '.pbxproj');
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
    if (pbx.includes('ShareExtension') || pbx.includes('expo-sharing-extension')) {
      throw new Error(`${rel} still references the share extension.`);
    }
    if (pbx.includes(APP_GROUP_ENTITLEMENT) || pbx.includes(APP_GROUP_ID)) {
      throw new Error(`${rel} still contains an App Group.`);
    }
  }

  const entitlements = walk(iosRoot, '.entitlements');
  if (entitlements.length === 0) {
    throw new Error(`No entitlements plist under ${iosRoot}.`);
  }
  for (const file of entitlements) {
    const xml = fs.readFileSync(file, 'utf8');
    if (xml.includes(APP_GROUP_ENTITLEMENT) || xml.includes(APP_GROUP_ID)) {
      throw new Error(`${path.relative(iosRoot, file)} still has an App Group entitlement.`);
    }
  }

  const plists = walk(iosRoot, 'Info.plist');
  for (const file of plists) {
    const xml = fs.readFileSync(file, 'utf8');
    if (xml.includes(SHARE_INFO_KEY) || xml.includes(APP_GROUP_ID)) {
      throw new Error(`${path.relative(iosRoot, file)} still names the share App Group.`);
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

function assertIosSharingUnlinked() {
  const names = readAutolinking('apple');
  if (names.includes('expo-sharing')) {
    throw new Error('expo-sharing is still autolinked into the iOS host.');
  }
}

function assertAndroidSharingLinked() {
  const names = readAutolinking('android');
  if (!names.includes('expo-sharing')) {
    throw new Error('expo-sharing is missing from Android autolinking.');
  }
}

if (require.main === module) {
  assertIosHost(path.join(process.cwd(), 'ios'));
  assertIosSharingUnlinked();
  assertAndroidSharingLinked();
  console.log('PASS one iOS target, no App Group entitlement, expo-sharing not linked on iOS, still linked on Android');
}

module.exports = {
  assertIosHost,
  assertIosSharingUnlinked,
  assertAndroidSharingLinked,
};
