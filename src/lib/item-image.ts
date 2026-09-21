/** Wishlist photo helpers — Storage path + safe preview URIs. No scrapers. */

export const WISHLIST_IMAGES_BUCKET = 'wishlist-images';
export const WISHLIST_IMAGE_MAX_BYTES = 8 * 1024 * 1024;

const SAFE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif']);

export function newImageId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

export function extFromMime(mime?: string | null, fileName?: string | null) {
  const fromName = fileName?.split('.').pop()?.toLowerCase();
  if (fromName && SAFE_EXT.has(fromName)) return fromName === 'jpeg' ? 'jpg' : fromName;

  switch ((mime ?? '').toLowerCase()) {
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    case 'image/gif':
      return 'gif';
    default:
      return 'jpg';
  }
}

export function mimeFromExt(ext: string) {
  switch (ext) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/jpeg';
  }
}

export function mimeFromFile(mime?: string | null, fileName?: string | null) {
  if (mime && mime.toLowerCase().startsWith('image/')) return mime;
  return mimeFromExt(extFromMime(mime, fileName));
}

/** First folder must be `auth.uid()` for Storage RLS. */
export function wishlistImageObjectPath(userId: string, ext: string) {
  const folder = userId.trim();
  if (!folder || folder.includes('/') || folder.includes('\\') || folder.includes('..')) {
    throw new Error('Couldn’t upload that photo');
  }
  const safeExt = SAFE_EXT.has(ext.toLowerCase()) ? ext.toLowerCase() : 'jpg';
  return `${folder}/${newImageId()}.${safeExt === 'jpeg' ? 'jpg' : safeExt}`;
}

export function isUnsafeImageUri(value: string) {
  return /^(javascript:|vbscript:|data:text\/)/i.test(value.trim());
}

export function looksLikeImageUri(value: string) {
  const trimmed = value.trim();
  if (!trimmed || isUnsafeImageUri(trimmed)) return false;
  return /^(https?:|data:image\/|blob:|file:|content:|ph:|assets-library:|ph-upload:)/i.test(trimmed);
}

export function dataUrlFromBase64(base64: string, mime?: string | null) {
  const type = mime && mime.startsWith('image/') ? mime : 'image/jpeg';
  return `data:${type};base64,${base64}`;
}
