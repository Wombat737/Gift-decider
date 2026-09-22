const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// List this plugin BEFORE expo-sharing in app.json. Expo runs the last plugin's
// mod first, so this file must be earlier in the array to patch files the
// share extension plugin has already written.
const DISPLAY_NAME = 'Gift Decider';
const TARGET_DIR = 'expo-sharing-extension';
const HOST_DIR = 'GiftDecider';
const APP_GROUP_ID = 'group.com.giftdecider.app';
const VERSION_SYNC_PHASE = 'Sync Share Extension Version';

// One pbxproj string. Real newlines are illegal inside a quoted shellScript;
// Xcode interprets \n when it runs the phase.
const VERSION_SYNC_SCRIPT = [
  'set -eu',
  `HOST_PLIST="\${SRCROOT}/${HOST_DIR}/Info.plist"`,
  `EXT_SRC_PLIST="\${SRCROOT}/${TARGET_DIR}/Info.plist"`,
  'APPEX_PLIST="${TARGET_BUILD_DIR}/${WRAPPER_NAME}/Info.plist"',
  'if [ ! -f "$HOST_PLIST" ]; then',
  '  echo "warning: Gift Decider share extension version sync skipped"',
  '  exit 0',
  'fi',
  'VERSION="$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$HOST_PLIST")"',
  'SHORT="$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$HOST_PLIST")"',
  'case "$VERSION" in',
  '  ""|*"$"*) echo "warning: host CFBundleVersion is not a literal ($VERSION)"; exit 0 ;;',
  'esac',
  'case "$SHORT" in',
  '  ""|*"$"*) echo "warning: host CFBundleShortVersionString is not a literal ($SHORT)"; exit 0 ;;',
  'esac',
  'sync_plist() {',
  '  PLIST="$1"',
  '  if [ ! -f "$PLIST" ]; then return 0; fi',
  '  /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $VERSION" "$PLIST"',
  '  /usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $SHORT" "$PLIST"',
  '}',
  'sync_plist "$EXT_SRC_PLIST"',
  'sync_plist "$APPEX_PLIST"',
].join('\\n');

function iosShareExtensionEnabled(config) {
  const plugins = config.plugins ?? [];
  for (const entry of plugins) {
    if (Array.isArray(entry) && entry[0] === 'expo-sharing') {
      return entry[1]?.ios?.enabled === true;
    }
  }
  return false;
}

/** Share sheet label. PRODUCT_NAME stays the target name so the .appex path does not change. */
function withShareDisplayName(config) {
  // app.config.js forces ios.enabled off until the extension can be proven
  // not to kill a cold open. Skip every native patch in that mode so the
  // host Info.plist does not gain ExpoShareIntoAppGroupId.
  if (!iosShareExtensionEnabled(config)) return config;

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const section = project.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(section)) {
      const entry = section[key];
      if (!entry || typeof entry !== 'object' || !entry.buildSettings) continue;
      const bundleId = String(entry.buildSettings.PRODUCT_BUNDLE_IDENTIFIER ?? '');
      const info = String(entry.buildSettings.INFOPLIST_FILE ?? '');
      const belongs =
        bundleId.includes('ShareExtension') ||
        bundleId.includes('expo-sharing-extension') ||
        info.includes(TARGET_DIR);
      if (!belongs) continue;
      entry.buildSettings.INFOPLIST_KEY_CFBundleDisplayName = `"${DISPLAY_NAME}"`;
      // The version-sync script reads the host Info.plist, which lives outside
      // this target. Sandboxed script phases cannot read it.
      entry.buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }

    ensureDependencySections(project);
    const extensionUuid = findTargetUuid(project, TARGET_DIR);
    const hostUuid = findTargetUuid(project, HOST_DIR);
    if (extensionUuid && !hasVersionSyncPhase(project)) {
      project.addBuildPhase([], 'PBXShellScriptBuildPhase', VERSION_SYNC_PHASE, extensionUuid, {
        shellPath: '/bin/sh',
        shellScript: VERSION_SYNC_SCRIPT,
      });
      // Patch the extension source plist before Xcode copies it into the appex.
      movePhaseFirst(project, extensionUuid, VERSION_SYNC_PHASE);
    }
    if (hostUuid && extensionUuid && !hostDependsOnExtension(project, hostUuid, extensionUuid)) {
      project.addTargetDependency(hostUuid, [extensionUuid]);
    }
    // expo-sharing drops the embed attributes. Without CodeSignOnCopy the
    // appex inside the app is unsigned, and iOS kills the host on a cold open.
    signEmbeddedShareExtension(project);
    return config;
  });

  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const root = config.modRequest.platformProjectRoot;
      const plistPath = path.join(root, TARGET_DIR, 'Info.plist');
      if (fs.existsSync(plistPath)) {
        const xml = fs.readFileSync(plistPath, 'utf8');
        const next = xml
          .replace(
            /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
            `$1${DISPLAY_NAME}$2`,
          )
          .replace(/(<key>CFBundleName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${DISPLAY_NAME}$2`);
        fs.writeFileSync(plistPath, next);
      }

      const hostPlistPath = path.join(root, HOST_DIR, 'Info.plist');
      if (fs.existsSync(hostPlistPath)) {
        const hostXml = fs.readFileSync(hostPlistPath, 'utf8');
        if (!hostXml.includes('<key>ExpoShareIntoAppGroupId</key>')) {
          const patched = hostXml.replace(
            /<\/dict>\s*<\/plist>\s*$/,
            `  <key>ExpoShareIntoAppGroupId</key>\n    <string>${APP_GROUP_ID}</string>\n  </dict>\n</plist>\n`,
          );
          fs.writeFileSync(hostPlistPath, patched);
        }
      }
      return config;
    },
  ]);

  return config;
}

function signEmbeddedShareExtension(project) {
  const files = project.pbxBuildFileSection();
  for (const key of Object.keys(files)) {
    if (key.endsWith('_comment')) continue;
    const entry = files[key];
    if (!entry || typeof entry !== 'object') continue;
    const comment = String(files[`${key}_comment`] ?? '');
    if (!comment.includes(`${TARGET_DIR}.appex`)) continue;
    const attrs = new Set(entry.settings?.ATTRIBUTES ?? []);
    attrs.add('RemoveHeadersOnCopy');
    attrs.add('CodeSignOnCopy');
    entry.settings = { ...(entry.settings ?? {}), ATTRIBUTES: [...attrs] };
  }

  const refs = project.pbxFileReferenceSection();
  for (const key of Object.keys(refs)) {
    if (key.endsWith('_comment')) continue;
    const ref = refs[key];
    if (!ref || typeof ref !== 'object') continue;
    for (const field of ['fileEncoding', 'lastKnownFileType', 'explicitFileType', 'defaultEncoding']) {
      if (ref[field] == null || ref[field] === 'undefined') delete ref[field];
    }
  }
}

function findTargetUuid(project, name) {
  const section = project.pbxNativeTargetSection();
  for (const key of Object.keys(section)) {
    if (key.endsWith('_comment')) continue;
    const entry = section[key];
    const targetName = String(entry?.name ?? '').replace(/^"|"$/g, '');
    if (targetName === name) return key;
  }
  return null;
}

function hasVersionSyncPhase(project) {
  const section = project.hash.project.objects.PBXShellScriptBuildPhase ?? {};
  return Object.keys(section).some((key) => {
    if (key.endsWith('_comment')) return false;
    const phase = section[key];
    return phase && typeof phase === 'object' && String(phase.name ?? '').includes(VERSION_SYNC_PHASE);
  });
}

function movePhaseFirst(project, targetUuid, phaseName) {
  const phases = project.pbxNativeTargetSection()[targetUuid].buildPhases;
  const index = phases.findIndex((item) => String(item.comment ?? '').includes(phaseName));
  if (index <= 0) return;
  const [phase] = phases.splice(index, 1);
  phases.unshift(phase);
}

function hostDependsOnExtension(project, hostUuid, extensionUuid) {
  const dependencies = project.pbxNativeTargetSection()[hostUuid].dependencies ?? [];
  const deps = project.hash.project.objects.PBXTargetDependency ?? {};
  return dependencies.some((item) => deps[item.value]?.target === extensionUuid);
}

function ensureDependencySections(project) {
  const objects = project.hash.project.objects;
  if (!objects.PBXTargetDependency) objects.PBXTargetDependency = {};
  if (!objects.PBXContainerItemProxy) objects.PBXContainerItemProxy = {};
}

module.exports = withShareDisplayName;
