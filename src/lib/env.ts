function read(name: string) {
  return (process.env[name] ?? '').trim();
}

function flag(name: string) {
  return read(name).toLowerCase() === 'true';
}

const supabaseUrl = read('EXPO_PUBLIC_SUPABASE_URL');
const supabasePublishableKey = read('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

const looksConfigured =
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('YOUR_PROJECT_REF') &&
  supabasePublishableKey.length > 20 &&
  !supabasePublishableKey.includes('YOUR_SUPABASE');

export const env = {
  supabaseUrl,
  supabasePublishableKey,
  isSupabaseConfigured: looksConfigured,
  appUrl: read('EXPO_PUBLIC_APP_URL') || 'http://localhost:8081',
  appleAuthEnabled: flag('EXPO_PUBLIC_APPLE_AUTH_ENABLED'),
  googleAuthEnabled: flag('EXPO_PUBLIC_GOOGLE_AUTH_ENABLED'),
  googleWebClientId: read('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID'),
  googleIosClientId: read('EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID'),
  googleAndroidClientId: read('EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID'),
  /** Optional. Exposed in the web bundle if set — prefer the Edge Function in production. */
  openaiApiKey: read('EXPO_PUBLIC_OPENAI_API_KEY'),
  llmUrl: read('EXPO_PUBLIC_LLM_URL'),
  llmModel: read('EXPO_PUBLIC_LLM_MODEL') || 'gpt-4o-mini',
  privacyPolicyUrl: read('EXPO_PUBLIC_PRIVACY_POLICY_URL'),
  supportEmail: read('EXPO_PUBLIC_SUPPORT_EMAIL') || 'hello@giftdecider.app',
  analyticsEnabled: flag('EXPO_PUBLIC_ANALYTICS_ENABLED'),
};

export function publicOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    const href = typeof document !== 'undefined' ? document.querySelector('base')?.getAttribute('href') : null;
    const prefix = !href || href === '/' ? '' : href.replace(/\/$/, '');
    return `${window.location.origin}${prefix}`;
  }
  return env.appUrl.replace(/\/$/, '');
}

export function shareLink(token: string) {
  return `${publicOrigin()}/g/${token}`;
}
