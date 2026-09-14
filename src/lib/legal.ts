import { env, publicOrigin } from '@/lib/env';

export function supportEmail() {
  return env.supportEmail;
}

export function privacyPolicyUrl() {
  if (env.privacyPolicyUrl) return env.privacyPolicyUrl;
  return `${publicOrigin()}/privacy`;
}

export function accountDeletionMailto() {
  const subject = encodeURIComponent('Gift Decider account deletion request');
  const body = encodeURIComponent(
    [
      'Please delete my Gift Decider account and associated wishlist data.',
      '',
      'Account email:',
      'Approximate date I signed up:',
      '',
      'This is a store-required deletion request. No automated backend mail yet.',
    ].join('\n'),
  );
  return `mailto:${supportEmail()}?subject=${subject}&body=${body}`;
}
