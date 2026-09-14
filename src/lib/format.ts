import type { ItemStatus } from '@/lib/types';

export function statusLabel(status: ItemStatus) {
  switch (status) {
    case 'reserved':
      return 'Reserved';
    case 'purchased':
      return 'Purchased';
    default:
      return 'Open';
  }
}

/** Giver-facing soft lock — no names, so other givers aren’t spoiled with who. */
export function giverStatusLabel(status: ItemStatus, funded = false) {
  if (funded) return 'Funded';
  switch (status) {
    case 'reserved':
      return 'Taken';
    case 'purchased':
      return 'Bought';
    default:
      return 'Open';
  }
}

export function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export function formatAud(amount: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

export function parseAud(value: string): number | null {
  const trimmed = value.trim().replace(/[^0-9.]/g, '');
  if (!trimmed) return null;
  const amount = Number.parseFloat(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100) / 100;
}

export function slugToken(prefix: string, title: string) {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
  return `${prefix}-${slug || 'occasion'}`;
}
