export type DelightKind = 'flick' | 'trickle';

const DEBOUNCE_MS = 900;

let current: DelightKind | null = null;
let lastStarted: Partial<Record<DelightKind, number>> = {};

export function resetDelight() {
  current = null;
  lastStarted = {};
}

export function activeDelight() {
  return current;
}

/** One hero at a time; debounce double-taps. Returns false if this fire should be skipped. */
export function tryStartDelight(kind: DelightKind, now = Date.now()) {
  if (current) return false;
  const previous = lastStarted[kind] ?? 0;
  if (now - previous < DEBOUNCE_MS) return false;
  current = kind;
  lastStarted[kind] = now;
  return true;
}

export function endDelight(kind: DelightKind) {
  if (current === kind) current = null;
}

export const DOLLAR_FLICK_MS = 800;
export const COIN_TRICKLE_MS = 900;
export const REDUCE_MOTION_TOAST_MS = 400;
export const BUTTON_PRESS_SCALE = 0.96;
export const BUTTON_PRESS_MS = 100;
