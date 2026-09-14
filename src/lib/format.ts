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

export function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}
