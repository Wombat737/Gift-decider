import type { SupabaseClient } from '@supabase/supabase-js';

/** Parse PKCE `code` or implicit `access_token` from a magic-link redirect URL. */
export function paramsFromAuthUrl(url: string) {
  const params = new URLSearchParams();
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');

  if (queryIndex >= 0) {
    const queryEnd = hashIndex > queryIndex ? hashIndex : url.length;
    new URLSearchParams(url.slice(queryIndex + 1, queryEnd)).forEach((value, key) => {
      params.set(key, value);
    });
  }

  if (hashIndex >= 0) {
    const hash = url.slice(hashIndex + 1);
    if (hash.includes('=')) {
      new URLSearchParams(hash).forEach((value, key) => {
        params.set(key, value);
      });
    }
  }

  return params;
}

export function webAuthRedirectTo(originWithPrefix: string) {
  return `${originWithPrefix.replace(/\/$/, '')}/auth/callback`;
}

const inFlight = new Map<string, Promise<'pkce' | 'implicit' | null>>();

export async function completeAuthFromUrl(
  url: string,
  client: Pick<SupabaseClient, 'auth'>,
): Promise<'pkce' | 'implicit' | null> {
  const existing = inFlight.get(url);
  if (existing) return existing;

  const work = completeAuthFromUrlOnce(url, client);
  inFlight.set(url, work);
  try {
    return await work;
  } finally {
    // Keep the settled promise so a second caller does not re-exchange the code.
  }
}

async function completeAuthFromUrlOnce(
  url: string,
  client: Pick<SupabaseClient, 'auth'>,
): Promise<'pkce' | 'implicit' | null> {
  const params = paramsFromAuthUrl(url);
  const errorDescription = params.get('error_description') || params.get('error');
  if (errorDescription) {
    throw new Error(errorDescription);
  }

  const code = params.get('code');
  if (code) {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return 'pkce';
  }

  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await client.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) throw error;
    return 'implicit';
  }

  return null;
}
