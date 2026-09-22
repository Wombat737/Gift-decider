const appJson = require('./app.json');

const baseUrl = (process.env.EXPO_BASE_URL || '').trim();

const EAS_OWNER = 'wombats';
const EAS_PROJECT_ID = 'd2cd72f5-20f3-42da-866d-c60b9dcd6b3e';

// Kill switch for the iOS share extension.
//
// TestFlight builds 31 and 32 crash on a cold open while
// com.giftdecider.app.ShareExtension is inside the app. PR #34 set
// CodeSignOnCopy on the embed; a real device still died. The host is also
// signed with App Group group.com.giftdecider.app. Assigning that group
// needs a local Apple session — the App Store Connect API cannot — so a
// cloud provisioning profile can omit it and iOS kills the process before
// any screen. This flag is what EAS and prebuild read. Leave it false until
// the README checklist is done on the Apple account, then flip it and ship
// a new production iOS build. An OTA update cannot add the extension back.
const IOS_SHARE_EXTENSION_ENABLED = false;

function pluginsWithIosShareExtension(plugins) {
  return (plugins ?? []).map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-sharing') return plugin;
    const options = plugin[1] && typeof plugin[1] === 'object' ? plugin[1] : {};
    const ios = options.ios && typeof options.ios === 'object' ? options.ios : {};
    return [
      'expo-sharing',
      {
        ...options,
        ios: {
          ...ios,
          enabled: IOS_SHARE_EXTENSION_ENABLED,
        },
      },
    ];
  });
}

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    owner: appJson.expo.owner || EAS_OWNER,
    plugins: pluginsWithIosShareExtension(appJson.expo.plugins),
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
