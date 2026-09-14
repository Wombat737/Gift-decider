const appJson = require('./app.json');

const baseUrl = (process.env.EXPO_BASE_URL || '').trim();

module.exports = {
  ...appJson,
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra || {}),
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
