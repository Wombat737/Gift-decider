import { env } from '@/lib/env';

export function supportEmail() {
  return env.supportEmail;
}

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;

export type PrivacyDestination = { type: 'external'; url: string } | { type: 'in-app' };

/** Hosted policy URL, or the in-app screen. Localhost is never returned. */
export function resolvePrivacyDestination(rawUrl: string | null | undefined): PrivacyDestination {
  const value = (rawUrl ?? '').trim();
  if (!value) return { type: 'in-app' };
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return { type: 'in-app' };
    if (LOCAL_HOST.test(parsed.hostname) || parsed.hostname.endsWith('.localhost')) return { type: 'in-app' };
    return { type: 'external', url: parsed.toString() };
  } catch {
    return { type: 'in-app' };
  }
}

export function privacyDestination(): PrivacyDestination {
  return resolvePrivacyDestination(env.privacyPolicyUrl);
}

/** Email fallback described in the privacy policy. In-app deletion does not use this. */
export function accountDeletionMailto() {
  const subject = encodeURIComponent('Gift Decider account deletion request');
  const body = encodeURIComponent(
    [
      'Please delete my Gift Decider account and associated wishlist data.',
      '',
      'Account email:',
      'Approximate date I signed up:',
    ].join('\n'),
  );
  return `mailto:${supportEmail()}?subject=${subject}&body=${body}`;
}
