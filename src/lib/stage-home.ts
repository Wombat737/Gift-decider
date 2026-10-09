import type { GroupGiftPhase, ItemKind, ItemStatus } from '@/lib/types';

/** Framed home thumb — inside the 72–96px / 12–16 radius band. */
export const StageThumbSize = 84;
export const StageThumbRadius = 14;

/** Sunshine pulse after a pick is pinned. Inside the 400–700ms band. */
export const PICK_PULSE_MS = 560;

export function daypartLabel(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Morning';
  if (hour < 17) return 'Afternoon';
  return 'Evening';
}

/** “Morning, Sam” — first name only. Bare daypart when we don’t have one yet. */
export function stageGreeting(name?: string | null, date = new Date()) {
  const part = daypartLabel(date);
  const first = (name ?? '').trim().split(/\s+/).filter(Boolean)[0];
  return first ? `${part}, ${first}` : part;
}

/** Two letters from the title. Used when a pick has no photo yet. */
export function thumbInitials(title?: string | null) {
  const words = (title ?? '')
    .replace(/[—–-]/g, ' ')
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z0-9]/g, ''))
    .filter((word) => word.length > 0);
  if (words.length === 0) return '·';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export function pickKindLabel(kind: ItemKind) {
  return kind === 'vibe' ? 'Taste' : 'Exact';
}

/** Stable 0–2 so a row keeps the same coral / neutral / sunshine wash. */
export function thumbPaletteIndex(seed: string) {
  let n = 0;
  for (let i = 0; i < seed.length; i += 1) n = (n + seed.charCodeAt(i)) % 3;
  return n;
}

/**
 * Giver card secondary. Chip in only while a group gift is still collecting.
 * Soft-lock is the quiet reserve on a solo available pick.
 */
export function giverCardSecondary(
  item: { is_group_gift: boolean; status: ItemStatus },
  phase: GroupGiftPhase | null,
): 'chip-in' | 'soft-lock' | null {
  if (phase === 'collecting') return 'chip-in';
  if (!item.is_group_gift && item.status === 'available') return 'soft-lock';
  return null;
}

export function stageTabVisible(pathname: string) {
  const path = pathname.replace(/\/$/, '') || '/';
  return path === '/wishlist' || path === '/add' || path === '/settings';
}

export function stageBarActive(pathname: string): 'people' | 'requests' | 'settings' | null {
  const path = (pathname.split('?')[0] ?? '').replace(/\/$/, '') || '/';
  if (path === '/people') return 'people';
  if (path === '/requests') return 'requests';
  if (path === '/settings') return 'settings';
  return null;
}

export function stageTabSelected(pathname: string): 'home' | 'add' | 'me' {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/add') return 'add';
  if (path === '/settings') return 'me';
  return 'home';
}
