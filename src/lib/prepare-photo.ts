/** Longest edge we upload. Full-resolution camera photos were the slow path. */
export const PHOTO_MAX_EDGE = 1600;

/** JPEG quality after the resize. */
export const PHOTO_JPEG_QUALITY = 0.72;

export type ResizeAction = { resize: { width: number } } | { resize: { height: number } };

/**
 * Downscale only when the longer edge is above PHOTO_MAX_EDGE.
 * Unknown sizes (0) return null so we do not upscale a small file.
 */
export function resizeAction(width: number, height: number): ResizeAction | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  if (Math.max(width, height) <= PHOTO_MAX_EDGE) return null;
  if (width >= height) return { resize: { width: PHOTO_MAX_EDGE } };
  return { resize: { height: PHOTO_MAX_EDGE } };
}
