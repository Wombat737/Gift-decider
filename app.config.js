const appJson = require('./app.json');

const baseUrl = (process.env.EXPO_BASE_URL || '').trim();

const EAS_OWNER = 'wombats';
const EAS_PROJECT_ID = 'd2cd72f5-20f3-42da-866d-c60b9dcd6b3e';

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    owner: appJson.expo.owner || EAS_OWNER,
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
