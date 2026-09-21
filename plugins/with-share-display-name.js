const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

// List this plugin BEFORE expo-sharing in app.json. Expo runs the last plugin's
// mod first, so this file must be earlier in the array to patch files the
// share extension plugin has already written.
const DISPLAY_NAME = 'Gift Decider';
const TARGET_DIR = 'expo-sharing-extension';

/** Share sheet label. PRODUCT_NAME stays the target name so the .appex path does not change. */
function withShareDisplayName(config) {
  config = withXcodeProject(config, (config) => {
    const section = config.modResults.pbxXCBuildConfigurationSection();
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
    }
    return config;
  });

  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const plistPath = path.join(config.modRequest.platformProjectRoot, TARGET_DIR, 'Info.plist');
      if (!fs.existsSync(plistPath)) return config;
      const xml = fs.readFileSync(plistPath, 'utf8');
      const next = xml
        .replace(
          /(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/,
          `$1${DISPLAY_NAME}$2`,
        )
        .replace(/(<key>CFBundleName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${DISPLAY_NAME}$2`);
      fs.writeFileSync(plistPath, next);
      return config;
    },
  ]);

  return config;
}

module.exports = withShareDisplayName;
