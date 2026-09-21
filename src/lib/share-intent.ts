import { sanitizeBuyUrl } from '@/lib/link-preview';

const URL_IN_TEXT = /https?:\/\/[^\s<>"')\]]+/gi;

let pendingShareUrl: string | null = null;

export function queryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

/** Pull the first public http(s) URL out of a share-sheet string. */
export function extractSharedUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  if (!value) return null;

  if (!/\s/.test(value)) {
    const direct = sanitizeBuyUrl(value.replace(/[),.;]+$/, ''));
    if (direct) return direct;
  }

  const matches = value.match(URL_IN_TEXT) ?? [];
  for (const match of matches) {
    const url = sanitizeBuyUrl(match.replace(/[),.;]+$/, ''));
    if (url) return url;
  }
  return null;
}

export function urlFromSharePayloads(
  payloads: { shareType?: string | null; value?: string | null }[] | null | undefined,
): string | null {
  if (!payloads?.length) return null;
  const ordered = [...payloads].sort((a, b) => {
    const score = (type?: string | null) => (type === 'url' ? 0 : type === 'text' || !type ? 1 : 2);
    return score(a.shareType) - score(b.shareType);
  });
  for (const payload of ordered) {
    if (payload.shareType && payload.shareType !== 'url' && payload.shareType !== 'text') continue;
    const found = extractSharedUrl(payload.value);
    if (found) return found;
  }
  return null;
}

/** True when Expo Router was opened by the share extension (`giftdecider://expo-sharing`). */
export function isIncomingSharePath(path: string) {
  const value = (path ?? '').trim();
  if (!value) return false;
  if (value === 'expo-sharing' || value === '/expo-sharing' || value === '//expo-sharing') return true;
  try {
    const url = new URL(value.includes('://') ? value : `giftdecider://${value.replace(/^\/+/, '')}`);
    if (url.hostname === 'expo-sharing') return true;
    const pathname = url.pathname.replace(/\/+$/, '');
    return pathname === '/expo-sharing';
  } catch {
    return value.includes('://expo-sharing');
  }
}

export function rememberPendingShareUrl(url: string) {
  pendingShareUrl = sanitizeBuyUrl(url);
}

export function peekPendingShareUrl() {
  return pendingShareUrl;
}

export function consumePendingShareUrl() {
  const value = pendingShareUrl;
  pendingShareUrl = null;
  return value;
}
