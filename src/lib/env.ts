function read(name: string, source: Record<string, string | undefined> = process.env) {
  return (source[name] ?? '').trim();
}

function flag(name: string, source: Record<string, string | undefined> = process.env) {
  return read(name, source).toLowerCase() === 'true';
}

export function resolveSupabaseConfig(source: Record<string, string | undefined> = process.env) {
  const supabaseUrl = read('EXPO_PUBLIC_SUPABASE_URL', source);
  const supabaseAnonKey =
    read('EXPO_PUBLIC_SUPABASE_ANON_KEY', source) || read('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', source);

  const looksConfigured =
    supabaseUrl.startsWith('http') &&
    !supabaseUrl.includes('YOUR_PROJECT_REF') &&
    supabaseAnonKey.length > 20 &&
    !supabaseAnonKey.includes('YOUR_SUPABASE');

  return {
    supabaseUrl,
    supabaseAnonKey,
    isSupabaseConfigured: looksConfigured,
  };
}

const supabase = resolveSupabaseConfig();

export const env = {
  supabaseUrl: supabase.supabaseUrl,
  supabaseAnonKey: supabase.supabaseAnonKey,
  /** @deprecated Use supabaseAnonKey. Kept so existing .env.local files still work. */
  supabasePublishableKey: supabase.supabaseAnonKey,
  isSupabaseConfigured: supabase.isSupabaseConfigured,
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
