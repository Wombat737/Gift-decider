import { isUnsafeImageUri, looksLikeImageUri, mimeFromFile } from '@/lib/item-image';
import { sanitizeBuyUrl } from '@/lib/link-preview';

const URL_IN_TEXT = /https?:\/\/[^\s<>"')\]]+/gi;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|heic|heif)(\?|#|$)/i;

let pendingShareUrl: string | null = null;

export type SharedPhoto = {
  uri: string;
  mimeType: string | null;
  fileName: string | null;
};

let pendingSharePhoto: SharedPhoto | null = null;

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

type SharePayloadLike = {
  shareType?: string | null;
  value?: string | null;
  mimeType?: string | null;
};

export function urlFromSharePayloads(payloads: SharePayloadLike[] | null | undefined): string | null {
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

function fileNameFromUri(uri: string) {
  try {
    const name = decodeURIComponent(uri.split('?')[0]?.split('#')[0]?.split('/').pop() ?? '');
    if (!name || name === '.' || name === '..' || name.includes('/') || name.includes('\\')) return null;
    return name;
  } catch {
    return null;
  }
}

/** A share-sheet image (Photos, screenshot), not a web page. */
export function isSharedImageValue(uri: string) {
  const trimmed = uri.trim();
  if (!trimmed || isUnsafeImageUri(trimmed) || !looksLikeImageUri(trimmed)) return false;
  if (/^https?:\/\//i.test(trimmed) && !IMAGE_EXT.test(trimmed)) return false;
  return true;
}

export function imageFromSharePayloads(payloads: SharePayloadLike[] | null | undefined): SharedPhoto | null {
  if (!payloads?.length) return null;
  for (const payload of payloads) {
    if (payload.shareType !== 'image') continue;
    const uri = (payload.value ?? '').trim();
    if (!isSharedImageValue(uri)) continue;
    const fileName = fileNameFromUri(uri);
    const mime = (payload.mimeType ?? '').toLowerCase();
    return {
      uri,
      mimeType: mime.startsWith('image/') ? mime : mimeFromFile(null, fileName),
      fileName,
    };
  }
  return null;
}

/** A link wins. An image is the draft photo only when the share has no URL. */
export function draftFromSharePayloads(payloads: SharePayloadLike[] | null | undefined) {
  const url = urlFromSharePayloads(payloads);
  if (url) return { url, photo: null as SharedPhoto | null };
  return { url: null as string | null, photo: imageFromSharePayloads(payloads) };
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
  const next = sanitizeBuyUrl(url);
  pendingShareUrl = next;
  if (next) pendingSharePhoto = null;
}

export function peekPendingShareUrl() {
  return pendingShareUrl;
}

export function consumePendingShareUrl() {
  const value = pendingShareUrl;
  pendingShareUrl = null;
  return value;
}

export function rememberPendingSharePhoto(photo: SharedPhoto) {
  pendingSharePhoto = photo;
  pendingShareUrl = null;
}

export function peekPendingSharePhoto() {
  return pendingSharePhoto;
}

export function consumePendingSharePhoto() {
  const value = pendingSharePhoto;
  pendingSharePhoto = null;
  return value;
}

export function hasPendingShare() {
  return Boolean(pendingShareUrl || pendingSharePhoto);
}
