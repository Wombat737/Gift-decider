const { withEntitlementsPlist, withFinalizedMod, withInfoPlist } = require('@expo/config-plugins');

const { assertIosHost, assertIosSharingUnlinked } = require('../scripts/check-ios-host');

const APP_GROUP_ENTITLEMENT = 'com.apple.security.application-groups';
const SHARE_INFO_KEY = 'ExpoShareIntoAppGroupId';

function dropAppExtensions(config) {
  const ios = config.extra?.eas?.build?.experimental?.ios;
  if (!ios || !Array.isArray(ios.appExtensions)) return config;
  ios.appExtensions = ios.appExtensions.filter((ext) => {
    const name = String(ext?.targetName ?? '');
    const bundle = String(ext?.bundleIdentifier ?? '');
    return !name.includes('sharing') && !bundle.includes('ShareExtension');
  });
  if (ios.appExtensions.length === 0) delete ios.appExtensions;
  return config;
}

/**
 * Listed first in the plugins array on purpose. Expo runs the last plugin's
 * mod first, so this mod runs after expo-sharing. The entitlements provider
 * copies file keys first and config keys second (`{...file, ...config}`).
 * An empty config object does not delete a group already in that plist.
 * Delete the key after the merge.
 */
function withoutIosShareNative(config) {
  config = dropAppExtensions(config);

  config = withEntitlementsPlist(config, (config) => {
    if (config.modResults && typeof config.modResults === 'object') {
      delete config.modResults[APP_GROUP_ENTITLEMENT];
    }
    if (config.ios?.entitlements && typeof config.ios.entitlements === 'object') {
      delete config.ios.entitlements[APP_GROUP_ENTITLEMENT];
    }
    dropAppExtensions(config);
    return config;
  });

  config = withInfoPlist(config, (config) => {
    if (config.modResults && typeof config.modResults === 'object') {
      delete config.modResults[SHARE_INFO_KEY];
    }
    return config;
  });

  config = withFinalizedMod(config, [
    'ios',
    (config) => {
      const root = config.modRequest.platformProjectRoot;
      const introspect = Boolean(config.modRequest.introspect);
      const fs = require('fs');
      const hasProject =
        fs.existsSync(root) && fs.readdirSync(root).some((name) => name.endsWith('.xcodeproj'));
      if (!introspect) assertIosSharingUnlinked();
      if (introspect && !hasProject) return config;
      assertIosHost(root);
      return config;
    },
  ]);

  return config;
}

module.exports = withoutIosShareNative;
