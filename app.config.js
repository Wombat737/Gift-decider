const appJson = require('./app.json');

const baseUrl = (process.env.EXPO_BASE_URL || '').trim();

const EAS_OWNER = 'wombats';
const EAS_PROJECT_ID = 'd2cd72f5-20f3-42da-866d-c60b9dcd6b3e';

// The iOS share extension is not in this host. TestFlight 31–33 died on a
// cold open. Do not flip this to true: that path used to inject
// group.com.giftdecider.app, and a cloud profile that lacks the group
// gets the process killed before JS. Bring the extension back only as a
// new change after the README checklist, including removing the iOS
// autolinking exclude in package.json.
const IOS_SHARE_EXTENSION_ENABLED = false;

if (IOS_SHARE_EXTENSION_ENABLED) {
  throw new Error(
    'iOS share extension is ripped out of the host. Leave IOS_SHARE_EXTENSION_ENABLED false. See README.',
  );
}

function pluginsWithoutIosShare(plugins) {
  const next = [];
  for (const plugin of plugins ?? []) {
    if (plugin === './plugins/with-share-display-name.js') continue;
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-sharing') {
      next.push(plugin);
      continue;
    }
    const options = plugin[1] && typeof plugin[1] === 'object' ? { ...plugin[1] } : {};
    delete options.ios;
    next.push(['expo-sharing', options]);
  }
  // First in the array so its mods run after expo-sharing and can delete
  // an App Group the entitlements provider merged back in.
  next.unshift('./plugins/without-ios-share-native.js');
  return next;
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    owner: appJson.expo.owner || EAS_OWNER,
    plugins: pluginsWithoutIosShare(appJson.expo.plugins),
    extra: {
      ...(appJson.expo.extra || {}),
      eas: {
        ...(appJson.expo.extra?.eas || {}),
        projectId: appJson.expo.extra?.eas?.projectId || EAS_PROJECT_ID,
      },
      privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL || '',
      supportEmail: process.env.EXPO_PUBLIC_SUPPORT_EMAIL || 'hello@giftdecider.app',
      analyticsEnabled: process.env.EXPO_PUBLIC_ANALYTICS_ENABLED === 'true',
    },
    experiments: {
      ...appJson.expo.experiments,
      ...(baseUrl ? { baseUrl } : {}),
    },
  },
};
